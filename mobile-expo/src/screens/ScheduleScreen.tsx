import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { api } from "../api/client";
import { dosageUnitOptions, timingOptions } from "../constants";
import { useAppContext } from "../context/AppContext";
import type {
  MedicationScheduleResponse,
  MedicationScheduleTimeResponse,
  MedicationTiming,
} from "../types";
import { formatScheduleLabel, todayDateInput } from "../utils";
import { Button, Field, InfoBanner, PillSelector, Screen, SectionCard } from "../ui";

const WEEKDAY_LABELS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
];

type ScheduleWithWindow = MedicationScheduleResponse & {
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
};

function createTimeSlots(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    takeTime: "",
    timing: "AFTER_MEAL" as MedicationTiming,
    sortOrder: index + 1,
  }));
}

function createDefaultForm() {
  return {
    customMedicineName: "",
    hospitalName: "",
    pharmacyName: "",
    dosageAmount: "1",
    dosageUnit: "TABLET",
    timesPerDay: "3",
    durationDays: "7",
    prescribedDate: todayDateInput(),
    dispensedDate: todayDateInput(),
  };
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseServerDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }

  return new Date(`${value}Z`);
}

function normalizeTakeTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function dateStringToDate(value: string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function timeStringToDate(value: string | null | undefined) {
  const [hour = "09", minute = "00"] = normalizeTakeTime(value || "09:00").split(":");
  const date = new Date();
  date.setHours(Number(hour) || 9);
  date.setMinutes(Number(minute) || 0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function formatTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function getEffectiveScheduleWindow(
  schedule: MedicationScheduleResponse,
  scheduleTimes: MedicationScheduleTimeResponse[]
) {
  const orderedTimes = [...scheduleTimes]
    .map((time) => normalizeTakeTime(time.takeTime))
    .filter(Boolean)
    .sort();

  const createdAt = parseServerDateTime(schedule.createdAt);
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null;
  const createdAtTime = createdAt
    ? `${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}`
    : null;

  const fallbackStartDate = schedule.startDate || createdAtDate;
  if (!fallbackStartDate) {
    return { startDate: null, endDate: null };
  }

  if (!orderedTimes.length) {
    return {
      startDate: fallbackStartDate,
      endDate: schedule.endDate || fallbackStartDate,
    };
  }

  const firstAvailableToday =
    createdAtDate === fallbackStartDate && createdAtTime
      ? orderedTimes.filter((takeTime) => takeTime >= createdAtTime)
      : orderedTimes;

  const normalizedStartDate =
    firstAvailableToday.length > 0
      ? fallbackStartDate
      : (() => {
          const nextDate = new Date(`${fallbackStartDate}T00:00:00`);
          nextDate.setDate(nextDate.getDate() + 1);
          return formatIsoDate(nextDate);
        })();

  const totalDailySlots = orderedTimes.length;
  const totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots;
  const firstDayDoseCount =
    normalizedStartDate === fallbackStartDate ? Math.max(firstAvailableToday.length, 1) : totalDailySlots;

  let remainingDoses = totalDoseCount;
  let currentDate = normalizedStartDate;

  while (remainingDoses > 0) {
    const dayTimes = currentDate === normalizedStartDate ? firstDayDoseCount : totalDailySlots;
    remainingDoses -= Math.min(remainingDoses, Math.max(dayTimes, 1));

    if (remainingDoses > 0) {
      const nextDate = new Date(`${currentDate}T00:00:00`);
      nextDate.setDate(nextDate.getDate() + 1);
      currentDate = formatIsoDate(nextDate);
    }
  }

  return { startDate: normalizedStartDate, endDate: currentDate };
}

function getDoseTimesForDate(
  schedule: MedicationScheduleResponse,
  scheduleTimes: MedicationScheduleTimeResponse[],
  targetDate: string
) {
  const { startDate, endDate } = getEffectiveScheduleWindow(schedule, scheduleTimes);

  if (!startDate || !endDate || targetDate < startDate || targetDate > endDate) {
    return [];
  }

  const orderedTimes = [...scheduleTimes]
    .map((time) => normalizeTakeTime(time.takeTime))
    .filter(Boolean)
    .sort();

  if (!orderedTimes.length) {
    return [];
  }

  const createdAt = parseServerDateTime(schedule.createdAt);
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null;
  const createdAtTime = createdAt
    ? `${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}`
    : null;

  const firstDayTimes =
    createdAtDate === startDate && createdAtTime
      ? orderedTimes.filter((takeTime) => takeTime >= createdAtTime)
      : orderedTimes;

  const totalDailySlots = orderedTimes.length;
  const totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots;

  let remainingDoses = totalDoseCount;
  let currentDate = startDate;

  while (remainingDoses > 0) {
    const dayTimes = currentDate === startDate ? firstDayTimes : orderedTimes;
    const visibleTimes = dayTimes.slice(0, remainingDoses);

    if (currentDate === targetDate) {
      return visibleTimes;
    }

    remainingDoses -= visibleTimes.length;
    const nextDate = new Date(`${currentDate}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    currentDate = formatIsoDate(nextDate);
  }

  return [];
}

function buildCalendarDays(referenceMonth: Date, schedules: ScheduleWithWindow[]) {
  const year = referenceMonth.getFullYear();
  const month = referenceMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const isoDate = formatIsoDate(current);
    const matchingSchedules = schedules.filter((schedule) => {
      if (!schedule.effectiveStartDate || !schedule.effectiveEndDate) {
        return false;
      }

      return schedule.effectiveStartDate <= isoDate && schedule.effectiveEndDate >= isoDate;
    });

    return {
      isoDate,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: isoDate === formatIsoDate(new Date()),
      schedules: matchingSchedules,
    };
  });
}

function useScheduleData() {
  const { settings, session } = useAppContext();
  const [items, setItems] = useState<ScheduleWithWindow[]>([]);
  const [scheduleTimesById, setScheduleTimesById] = useState<Record<number, MedicationScheduleTimeResponse[]>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSchedules = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.getSchedules(settings, session);
      const timeEntries = await Promise.all(
        response.map(async (schedule) => [
          schedule.id,
          await api.getScheduleTimes(settings, session, schedule.id),
        ] as const)
      );
      const nextScheduleTimesById = Object.fromEntries(timeEntries);
      setScheduleTimesById(nextScheduleTimesById);
      setItems(
        response.map((schedule) => {
          const window = getEffectiveScheduleWindow(schedule, nextScheduleTimesById[schedule.id] || []);
          return {
            ...schedule,
            effectiveStartDate: window.startDate,
            effectiveEndDate: window.endDate,
          };
        })
      );
    } catch (error: any) {
      setMessage("복약 일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [session, settings]);

  return {
    items,
    scheduleTimesById,
    message,
    setMessage,
    loading,
    loadSchedules,
    settings,
    session,
  };
}

export function MyScheduleListScreen({ navigation }: any) {
  const { items, message, setMessage, loading, loadSchedules, settings, session } = useScheduleData();

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  const handleDelete = async (item: MedicationScheduleResponse) => {
    if (!session) {
      return;
    }

    try {
      const [times, logs] = await Promise.all([
        api.getScheduleTimes(settings, session, item.id),
        api.getIntakeLogs(settings, session, item.id),
      ]);

      await Promise.all(logs.map((log) => api.deleteIntakeLog(settings, session, log.id)));
      await Promise.all(times.map((time) => api.deleteScheduleTime(settings, session, time.id)));
      await api.deleteSchedule(settings, session, item.id);
      setMessage("복약 일정을 삭제했습니다.");
      await loadSchedules();
    } catch {
      setMessage("복약 일정 삭제에 실패했습니다.");
    }
  };

  return (
    <Screen>
      <SectionCard
        title="전체 일정 목록"
        subtitle="등록된 복약 일정을 한 번에 보고, 눌러서 수정하거나 바로 삭제할 수 있습니다."
      >
        {loading ? (
          <Text style={{ color: "#547066" }}>일정을 불러오는 중입니다.</Text>
        ) : items.length ? (
          <View style={{ gap: 12 }}>
            {items.map((item) => (
              <View
                key={`schedule-list-${item.id}`}
                style={{
                  borderWidth: 1,
                  borderColor: "#d9e7e2",
                  borderRadius: 18,
                  padding: 14,
                  gap: 6,
                  backgroundColor: "#fbfdfc",
                }}
              >
                <Pressable onPress={() => navigation.navigate("MyScheduleForm", { scheduleId: item.id })}>
                  <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                    {formatScheduleLabel(item)}
                  </Text>
                  <Text style={{ color: "#547066", lineHeight: 20 }}>
                    {(item.hospitalName || "병원 미입력") + " · " + (item.pharmacyName || "약국 미입력")}
                  </Text>
                  <Text style={{ color: "#547066", lineHeight: 20 }}>
                    {"처방일 " + (item.prescribedDate || "-") + " / 조제일 " + (item.dispensedDate || "-")}
                  </Text>
                  <Text style={{ color: "#547066", lineHeight: 20 }}>
                    {(item.effectiveStartDate || "-") + " ~ " + (item.effectiveEndDate || "-")}
                  </Text>
                </Pressable>
                <Button title="삭제" onPress={() => handleDelete(item)} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            등록된 복약 일정이 없습니다.
          </Text>
        )}
      </SectionCard>

      {message ? (
        <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} />
      ) : null}
    </Screen>
  );
}

export function ScheduleCalendarScreen({ navigation }: any) {
  const { items, scheduleTimesById, message, setMessage, loading, loadSchedules, settings, session } =
    useScheduleData();
  const [plusModalVisible, setPlusModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(formatIsoDate(new Date()));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setPlusModalVisible(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#edf7f5",
          }}
        >
          <Ionicons name="add" size={22} color="#0f766e" />
        </Pressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth, items), [currentMonth, items]);

  const selectedDaySchedules = useMemo(
    () =>
      items.filter(
        (schedule) =>
          schedule.effectiveStartDate &&
          schedule.effectiveEndDate &&
          schedule.effectiveStartDate <= selectedDate &&
          schedule.effectiveEndDate >= selectedDate
      ),
    [items, selectedDate]
  );

  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleDelete = async (item: MedicationScheduleResponse) => {
    if (!session) {
      return;
    }

    try {
      const [times, logs] = await Promise.all([
        api.getScheduleTimes(settings, session, item.id),
        api.getIntakeLogs(settings, session, item.id),
      ]);

      await Promise.all(logs.map((log) => api.deleteIntakeLog(settings, session, log.id)));
      await Promise.all(times.map((time) => api.deleteScheduleTime(settings, session, time.id)));
      await api.deleteSchedule(settings, session, item.id);
      setMessage("복약 일정을 삭제했습니다.");
      await loadSchedules();
    } catch (error: any) {
      setMessage("복약 일정 삭제에 실패했습니다.");
    }
  };

  return (
    <>
      <Screen>
        <SectionCard
          title="복약 캘린더"
          subtitle="날짜를 눌러 그날의 복약 일정을 확인해 보세요."
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Button title="이전 달" onPress={() => moveMonth(-1)} secondary />
            <Text style={{ color: "#10332b", fontSize: 18, fontWeight: "800" }}>
              {currentMonth.getFullYear()}
              {"년 "}
              {currentMonth.getMonth() + 1}
              {"월"}
            </Text>
            <Button title="다음 달" onPress={() => moveMonth(1)} secondary />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} style={{ width: "13.2%", alignItems: "center" }}>
                <Text style={{ color: "#547066", fontWeight: "700" }}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.isoDate;

              return (
                <Pressable
                  key={day.isoDate}
                  onPress={() => setSelectedDate(day.isoDate)}
                  style={{
                    width: "13.2%",
                    height: 58,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isSelected ? "#0f766e" : "#d9e7e2",
                    backgroundColor: isSelected ? "#edf7f5" : "#ffffff",
                    paddingVertical: 8,
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: day.isCurrentMonth ? 1 : 0.35,
                  }}
                >
                  <Text
                    style={{
                      color: day.isToday ? "#0f766e" : "#10332b",
                      fontWeight: day.isToday ? "800" : "700",
                    }}
                  >
                    {day.dayNumber}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 4, minHeight: 8 }}>
                    {day.schedules.slice(0, 3).map((schedule) => (
                      <View
                        key={`${day.isoDate}-${schedule.id}`}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#0f766e",
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard
          title={`${selectedDate} 일정`}
          subtitle="선택한 날짜의 세부 일정은 아래에서 확인할 수 있어요."
        >
          {loading ? (
            <Text style={{ color: "#547066" }}>
              {"일정을 불러오는 중입니다."}
            </Text>
          ) : selectedDaySchedules.length ? (
            <View style={{ gap: 12 }}>
              {selectedDaySchedules.map((item) => {
                const doseTimes = getDoseTimesForDate(item, scheduleTimesById[item.id] || [], selectedDate);

                return (
                  <Pressable
                    key={`selected-${item.id}`}
                    onPress={() => navigation.navigate("ScheduleForm", { scheduleId: item.id })}
                    style={{
                      borderWidth: 1,
                      borderColor: "#d9e7e2",
                      borderRadius: 18,
                      padding: 14,
                      gap: 6,
                      backgroundColor: "#fbfdfc",
                    }}
                  >
                    <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                      {formatScheduleLabel(item)}
                    </Text>
                    <Text style={{ color: "#547066", lineHeight: 20 }}>
                      {(item.hospitalName || "병원 미입력") +
                        " · " +
                        (item.pharmacyName || "약국 미입력")}
                    </Text>
                    <Text style={{ color: "#547066", lineHeight: 20 }}>
                      {(item.effectiveStartDate || "-") + " ~ " + (item.effectiveEndDate || "-")}
                    </Text>
                    <Text style={{ color: "#547066", lineHeight: 20 }}>
                      {"복용 시간: " + (doseTimes.length ? doseTimes.join(", ") : "없음")}
                    </Text>
                    <View style={{ marginTop: 6 }}>
                      <Button title="삭제" onPress={() => handleDelete(item)} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: "#547066", lineHeight: 22 }}>
              {"선택한 날짜에는 등록된 복약 일정이 없습니다."}
            </Text>
          )}
        </SectionCard>

        {message ? (
          <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} />
        ) : null}
      </Screen>

      <Modal
        transparent
        visible={plusModalVisible}
        animationType="fade"
        onRequestClose={() => setPlusModalVisible(false)}
      >
        <Pressable
          onPress={() => setPlusModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(16, 51, 43, 0.28)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              borderRadius: 28,
              backgroundColor: "#ffffff",
              padding: 20,
              gap: 16,
            }}
          >
            <Text style={{ color: "#10332b", fontSize: 20, fontWeight: "800" }}>
              {"복약 일정 추가"}
            </Text>
            <Text style={{ color: "#547066", lineHeight: 22 }}>
              {"원하는 방식으로 복약 일정을 등록해 주세요."}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {}}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#d9e7e2",
                  padding: 16,
                  gap: 8,
                  backgroundColor: "#fbfdfc",
                }}
              >
                <Ionicons name="document-image-outline" size={28} color="#0f766e" />
                <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                  {"처방전 사진 업로드"}
                </Text>
                <Text style={{ color: "#547066", lineHeight: 20 }}>
                  {"준비 중인 기능입니다."}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setPlusModalVisible(false);
                  navigation.navigate("ScheduleForm");
                }}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#0f766e",
                  padding: 16,
                  gap: 8,
                  backgroundColor: "#edf7f5",
                }}
              >
                <Ionicons name="create-outline" size={28} color="#0f766e" />
                <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                  {"직접 입력하기"}
                </Text>
                <Text style={{ color: "#547066", lineHeight: 20 }}>
                  {"약 이름과 복용 시간을 직접 등록합니다."}
                </Text>
              </Pressable>
            </View>

            <Button title="닫기" onPress={() => setPlusModalVisible(false)} secondary />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function ScheduleFormScreen({ navigation, route }: any) {
  const { settings, session } = useAppContext();
  const editingId = route?.params?.scheduleId ?? null;
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createDefaultForm());
  const [timeSlots, setTimeSlots] = useState(createTimeSlots(3));
  const [datePickerTarget, setDatePickerTarget] = useState<"prescribedDate" | "dispensedDate" | null>(null);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => null,
      title: editingId ? "복약 일정 수정" : "복약 일정 등록",
    });
  }, [editingId, navigation]);

  const timesPerDay = useMemo(() => {
    const parsed = Number(form.timesPerDay);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(parsed, 12);
  }, [form.timesPerDay]);

  useEffect(() => {
    setTimeSlots((prev) =>
      Array.from({ length: timesPerDay }, (_, index) => ({
        ...(prev[index] || createTimeSlots(timesPerDay)[index]),
        sortOrder: index + 1,
      }))
    );
  }, [timesPerDay]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadDetail = async () => {
        if (!session || !editingId) {
          return;
        }

        try {
          const schedules = await api.getSchedules(settings, session);
          const item = schedules.find((schedule) => schedule.id === editingId);
          if (!item || !active) {
            return;
          }

          const times = await api.getScheduleTimes(settings, session, item.id);
          const ordered = [...times].sort((a, b) => a.sortOrder - b.sortOrder);

          if (!active) {
            return;
          }

          setForm({
            customMedicineName: item.customMedicineName || "",
            hospitalName: item.hospitalName || "",
            pharmacyName: item.pharmacyName || "",
            dosageAmount: item.dosageAmount ? String(item.dosageAmount) : "",
            dosageUnit: item.dosageUnit || "TABLET",
            timesPerDay: item.timesPerDay ? String(item.timesPerDay) : "1",
            durationDays: item.durationDays ? String(item.durationDays) : "1",
            prescribedDate: item.prescribedDate || todayDateInput(),
            dispensedDate: item.dispensedDate || todayDateInput(),
          });
          setTimeSlots(
            ordered.length
              ? ordered.map((time) => ({
                  takeTime: normalizeTakeTime(time.takeTime),
                  timing: time.timing,
                  sortOrder: time.sortOrder,
                }))
              : createTimeSlots(item.timesPerDay || 1)
          );
        } catch {
          if (active) {
            setMessage("일정 상세 조회에 실패했습니다.");
          }
        }
      };

      if (!editingId) {
        setForm(createDefaultForm());
        setTimeSlots(createTimeSlots(3));
        setMessage("");
      } else {
        loadDetail();
      }

      return () => {
        active = false;
      };
    }, [editingId, session, settings])
  );

  const buildPayload = () => ({
    medicineId: null,
    customMedicineName: form.customMedicineName || null,
    hospitalName: form.hospitalName || null,
    pharmacyName: form.pharmacyName || null,
    dosageAmount: form.dosageAmount ? Number(form.dosageAmount) : null,
    dosageUnit: form.dosageUnit || null,
    frequencyType: "DAILY",
    timesPerDay,
    intervalHours: null,
    durationDays: Number(form.durationDays) || 1,
    startDate: null,
    endDate: null,
    prescribedDate: form.prescribedDate || null,
    dispensedDate: form.dispensedDate || null,
    isActive: null,
  });

  const handleSave = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const schedule = editingId
        ? await api.updateSchedule(settings, session, editingId, buildPayload())
        : await api.createSchedule(settings, session, buildPayload());

      const existingTimes = editingId ? await api.getScheduleTimes(settings, session, schedule.id) : [];
      await Promise.all(existingTimes.map((time) => api.deleteScheduleTime(settings, session, time.id)));
      await Promise.all(
        timeSlots.map((slot, index) =>
          api.createScheduleTime(settings, session, {
            medicationScheduleId: schedule.id,
            timing: slot.timing,
            takeTime: slot.takeTime || "09:00",
            sortOrder: index + 1,
          })
        )
      );

      navigation.goBack();
    } catch {
      setMessage("복약 일정 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (editingId) {
      return;
    }

    setForm(createDefaultForm());
    setTimeSlots(createTimeSlots(3));
    setMessage("");
  };

  const closePickers = () => {
    setDatePickerTarget(null);
    setTimePickerIndex(null);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerTarget(null);
    }

    if (!selectedDate || !datePickerTarget) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      [datePickerTarget]: formatIsoDate(selectedDate),
    }));
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setTimePickerIndex(null);
    }

    if (!selectedDate || timePickerIndex === null) {
      return;
    }

    setTimeSlots((prev) =>
      prev.map((target, slotIndex) =>
        slotIndex === timePickerIndex ? { ...target, takeTime: formatTime(selectedDate) } : target
      )
    );
  };

  return (
    <Screen>
      <SectionCard
        title={editingId ? "복약 일정 수정" : "복약 일정 등록"}
        subtitle="직접 입력으로 약 이름, 병원, 복용 기간과 시간대를 등록할 수 있어요."
      >
        <Field
          label="약 이름"
          value={form.customMedicineName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, customMedicineName: value }))}
        />
        <Field
          label="병원명"
          value={form.hospitalName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, hospitalName: value }))}
        />
        <Field
          label="약국명"
          value={form.pharmacyName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, pharmacyName: value }))}
        />
        <Field
          label="복용량"
          value={form.dosageAmount}
          onChangeText={(value) => setForm((prev) => ({ ...prev, dosageAmount: value }))}
          keyboardType="numeric"
        />
        <PillSelector
          options={dosageUnitOptions}
          value={form.dosageUnit}
          onChange={(value) => setForm((prev) => ({ ...prev, dosageUnit: value }))}
        />
        <Field
          label="하루 복용 횟수"
          value={form.timesPerDay}
          onChangeText={(value) => setForm((prev) => ({ ...prev, timesPerDay: value }))}
          keyboardType="numeric"
        />
        <Field
          label="총 복용 일수"
          value={form.durationDays}
          onChangeText={(value) => setForm((prev) => ({ ...prev, durationDays: value }))}
          keyboardType="numeric"
        />
        <Pressable
          onPress={() => setDatePickerTarget("prescribedDate")}
          style={{
            borderWidth: 1,
            borderColor: "#d9e7e2",
            borderRadius: 16,
            padding: 14,
            gap: 6,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#35574e", fontWeight: "700" }}>{"처방일"}</Text>
          <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "700" }}>
            {form.prescribedDate || "날짜 선택"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDatePickerTarget("dispensedDate")}
          style={{
            borderWidth: 1,
            borderColor: "#d9e7e2",
            borderRadius: 16,
            padding: 14,
            gap: 6,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#35574e", fontWeight: "700" }}>{"조제일"}</Text>
          <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "700" }}>
            {form.dispensedDate || "날짜 선택"}
          </Text>
        </Pressable>

        <Text style={{ color: "#35574e", fontWeight: "700", fontSize: 16 }}>
          {"복용 시간"}
        </Text>
        {timeSlots.map((slot, index) => (
          <View
            key={`slot-${index + 1}`}
            style={{
              borderWidth: 1,
              borderColor: "#d9e7e2",
              borderRadius: 18,
              padding: 12,
              gap: 10,
            }}
          >
            <Text style={{ color: "#10332b", fontWeight: "700" }}>
              {`${index + 1}회차`}
            </Text>
            <Pressable
              onPress={() => setTimePickerIndex(index)}
              style={{
                borderWidth: 1,
                borderColor: "#d9e7e2",
                borderRadius: 16,
                padding: 14,
                gap: 6,
                backgroundColor: "#ffffff",
              }}
            >
              <Text style={{ color: "#35574e", fontWeight: "700" }}>{"시간"}</Text>
              <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "700" }}>
                {slot.takeTime || "09:00"}
              </Text>
            </Pressable>
            <PillSelector
              options={timingOptions}
              value={slot.timing}
              onChange={(value) =>
                setTimeSlots((prev) =>
                  prev.map((target, slotIndex) =>
                    slotIndex === index ? { ...target, timing: value as MedicationTiming } : target
                  )
                )
              }
            />
          </View>
        ))}

        {message ? (
          <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} />
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={editingId ? "수정 저장" : "일정 등록"}
              onPress={handleSave}
              loading={loading}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="초기화"
              onPress={resetForm}
              secondary
              disabled={Boolean(editingId)}
            />
          </View>
        </View>
      </SectionCard>

      {Platform.OS === "android" && datePickerTarget ? (
        <DateTimePicker
          value={dateStringToDate(form[datePickerTarget])}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      ) : null}

      {Platform.OS === "android" && timePickerIndex !== null ? (
        <DateTimePicker
          value={timeStringToDate(timeSlots[timePickerIndex]?.takeTime || "09:00")}
          mode="time"
          display="spinner"
          is24Hour
          onChange={handleTimeChange}
        />
      ) : null}

      <Modal
        transparent
        visible={Platform.OS === "ios" && (datePickerTarget !== null || timePickerIndex !== null)}
        animationType="fade"
        onRequestClose={closePickers}
      >
        <Pressable
          onPress={closePickers}
          style={{
            flex: 1,
            backgroundColor: "rgba(16, 51, 43, 0.28)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              borderRadius: 28,
              backgroundColor: "#ffffff",
              padding: 20,
              gap: 16,
            }}
          >
            <Text style={{ color: "#10332b", fontSize: 20, fontWeight: "800" }}>
              {datePickerTarget ? "날짜 선택" : "시간 선택"}
            </Text>

            {datePickerTarget ? (
  <DateTimePicker
    value={dateStringToDate(form[datePickerTarget])}
    mode="date"
    display="inline"
    themeVariant="light"
    accentColor="#0f766e"
    textColor="#10332b"
    style={{
      width: "100%",
      height: 360,
      backgroundColor: "#ffffff",
    }}
    onChange={handleDateChange}
  />
) : null}

{timePickerIndex !== null ? (
  <DateTimePicker
    value={timeStringToDate(timeSlots[timePickerIndex]?.takeTime || "09:00")}
    mode="time"
    display="spinner"
    is24Hour
    themeVariant="light"
    accentColor="#0f766e"
    textColor="#10332b"
    style={{
      width: "100%",
      height: 220,
      backgroundColor: "#ffffff",
    }}
    onChange={handleTimeChange}
  />
) : null}

            <Button title="선택 완료" onPress={closePickers} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
