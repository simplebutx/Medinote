import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../api/client";
import { dosageUnitOptions, timingOptions } from "../constants";
import { useAppContext } from "../context/AppContext";
import type {
  MedicationIntakeLogRequest,
  MedicationIntakeLogResponse,
  MedicationScheduleResponse,
  MedicationScheduleTimeResponse,
  MedicationTiming,
} from "../types";
import { formatScheduleLabel, todayDateInput } from "../utils";
import { Button, Field, InfoBanner, PillSelector, Screen, SectionCard } from "../ui";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type ScheduleWithWindow = MedicationScheduleResponse & {
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
};

type DoseGroupItem = {
  scheduleId: number;
  scheduleTimeId: number;
  name: string;
  scheduledAt: string;
  takenAt: string | null;
  takenLogIds: number[];
};

type DoseGroup = {
  key: string;
  takeTime: string;
  items: DoseGroupItem[];
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
  date.setHours(Number(hour) || 9, Number(minute) || 0, 0, 0);
  return date;
}

function formatTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function getDatePart(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return String(value).split("T")[0] || null;
}

function formatTimeLabel(value: string | null | undefined) {
  const normalized = normalizeTakeTime(value);
  if (!normalized) {
    return "시간 미정";
  }

  const [hourText = "0", minuteText = "00"] = normalized.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const period = hour < 12 ? "오전" : "오후";
  const twelveHour = hour % 12 || 12;

  return `${period} ${twelveHour}:${String(minute).padStart(2, "0")}`;
}

function formatTakenAt(value: string | null | undefined) {
  const date = parseServerDateTime(value);
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalDateTimeString(isoDate: string, takeTime: string) {
  return `${isoDate}T${normalizeTakeTime(takeTime) || "00:00"}:00`;
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

function isDoseVisibleOnDate(schedule: MedicationScheduleResponse, takeTime: string, isoDate: string) {
  const createdAt = parseServerDateTime(schedule.createdAt);
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return true;
  }

  if (formatIsoDate(createdAt) !== isoDate) {
    return true;
  }

  return normalizeTakeTime(takeTime) >= `${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}`;
}

function buildDoseGroups(
  schedules: ScheduleWithWindow[],
  scheduleTimesById: Record<number, MedicationScheduleTimeResponse[]>,
  intakeLogsByScheduleId: Record<number, MedicationIntakeLogResponse[]>,
  selectedDate: string
) {
  const groups: DoseGroup[] = [];
  const groupMap = new Map<string, DoseGroup>();

  schedules.forEach((schedule) => {
    if (
      !schedule.effectiveStartDate ||
      !schedule.effectiveEndDate ||
      schedule.effectiveStartDate > selectedDate ||
      schedule.effectiveEndDate < selectedDate
    ) {
      return;
    }

    const scheduleTimes = scheduleTimesById[schedule.id] || [];
    const intakeLogs = intakeLogsByScheduleId[schedule.id] || [];

    scheduleTimes.forEach((scheduleTime) => {
      const takeTime = normalizeTakeTime(scheduleTime.takeTime);
      if (!takeTime || !isDoseVisibleOnDate(schedule, takeTime, selectedDate)) {
        return;
      }

      const takenLogs = intakeLogs.filter(
        (log) =>
          log.medicationScheduleTimeId === scheduleTime.id &&
          log.status === "TAKEN" &&
          getDatePart(log.scheduledAt) === selectedDate
      );

      const item: DoseGroupItem = {
        scheduleId: schedule.id,
        scheduleTimeId: scheduleTime.id,
        name: schedule.customMedicineName || `약 #${schedule.medicineId ?? "-"}`,
        scheduledAt: toLocalDateTimeString(selectedDate, takeTime),
        takenAt: takenLogs[0]?.takenAt || null,
        takenLogIds: takenLogs.map((log) => log.id),
      };

      if (!groupMap.has(takeTime)) {
        const group = { key: takeTime, takeTime, items: [item] };
        groupMap.set(takeTime, group);
        groups.push(group);
        return;
      }

      groupMap.get(takeTime)?.items.push(item);
    });
  });

  return groups
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => left.name.localeCompare(right.name, "ko-KR")),
    }))
    .sort((left, right) => left.takeTime.localeCompare(right.takeTime));
}

function useScheduleData() {
  const { settings, session } = useAppContext();
  const [items, setItems] = useState<ScheduleWithWindow[]>([]);
  const [scheduleTimesById, setScheduleTimesById] = useState<Record<number, MedicationScheduleTimeResponse[]>>({});
  const [intakeLogsByScheduleId, setIntakeLogsByScheduleId] = useState<Record<number, MedicationIntakeLogResponse[]>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadIntakeLogs = useCallback(
    async (targetItems: ScheduleWithWindow[]) => {
      if (!session) {
        return;
      }

      const logEntries = await Promise.all(
        targetItems.map(async (schedule) => [
          schedule.id,
          await api.getIntakeLogs(settings, session, schedule.id),
        ] as const)
      );
      setIntakeLogsByScheduleId(Object.fromEntries(logEntries));
    },
    [session, settings]
  );

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

      const mapped = response.map((schedule) => {
        const window = getEffectiveScheduleWindow(schedule, nextScheduleTimesById[schedule.id] || []);
        return {
          ...schedule,
          effectiveStartDate: window.startDate,
          effectiveEndDate: window.endDate,
        };
      });

      setItems(mapped);
      await loadIntakeLogs(mapped);
    } catch {
      setMessage("복약 일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [loadIntakeLogs, session, settings]);

  return {
    items,
    scheduleTimesById,
    intakeLogsByScheduleId,
    message,
    setMessage,
    loading,
    loadSchedules,
    loadIntakeLogs,
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
      setMessage("복약 일정이 삭제되었습니다.");
      await loadSchedules();
    } catch {
      setMessage("복약 일정 삭제에 실패했습니다.");
    }
  };

  return (
    <Screen>
      <SectionCard
        title="전체 일정 목록"
        subtitle="등록된 복약 일정을 한 번에 보고, 눌러서 수정하거나 바로 삭제할 수 있어요."
      >
        {loading ? (
          <Text style={mobileStyles.mutedText}>일정을 불러오는 중입니다.</Text>
        ) : items.length ? (
          <View style={{ gap: 12 }}>
            {items.map((item) => (
              <View key={`schedule-list-${item.id}`} style={mobileStyles.listItemCard}>
                <Pressable onPress={() => navigation.navigate("MyScheduleForm", { scheduleId: item.id })}>
                  <Text style={mobileStyles.listItemTitle}>{formatScheduleLabel(item)}</Text>
                  <Text style={mobileStyles.listItemMeta}>
                    {(item.hospitalName || "병원 미입력") + " · " + (item.pharmacyName || "약국 미입력")}
                  </Text>
                  <Text style={mobileStyles.listItemMeta}>
                    {"처방일 " + (item.prescribedDate || "-") + " / 조제일 " + (item.dispensedDate || "-")}
                  </Text>
                  <Text style={mobileStyles.listItemMeta}>
                    {(item.effectiveStartDate || "-") + " ~ " + (item.effectiveEndDate || "-")}
                  </Text>
                </Pressable>
                <Button title="삭제" onPress={() => handleDelete(item)} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={mobileStyles.mutedText}>등록된 복약 일정이 없습니다.</Text>
        )}
      </SectionCard>

      {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
    </Screen>
  );
}

export function ScheduleCalendarScreen({ navigation }: any) {
  const {
    items,
    scheduleTimesById,
    intakeLogsByScheduleId,
    message,
    setMessage,
    loading,
    loadSchedules,
    loadIntakeLogs,
    settings,
    session,
  } = useScheduleData();
  const [plusModalVisible, setPlusModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(formatIsoDate(new Date()));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setPlusModalVisible(true)} style={mobileStyles.headerIconButton}>
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
  const doseGroups = useMemo(
    () => buildDoseGroups(items, scheduleTimesById, intakeLogsByScheduleId, selectedDate),
    [intakeLogsByScheduleId, items, scheduleTimesById, selectedDate]
  );

  const moveMonth = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleToggleMedicine = async (item: DoseGroupItem) => {
    if (!session) {
      return;
    }

    setActionLoading(true);
    try {
      if (item.takenLogIds.length) {
        await Promise.all(item.takenLogIds.map((id) => api.deleteIntakeLog(settings, session, id)));
      } else {
        const payload: MedicationIntakeLogRequest = {
          medicationScheduleId: item.scheduleId,
          medicationScheduleTimeId: item.scheduleTimeId,
          status: "TAKEN",
          scheduledAt: item.scheduledAt,
          takenAt: new Date().toISOString().slice(0, 19),
        };
        await api.createIntakeLog(settings, session, payload);
      }

      await loadIntakeLogs(items);
    } catch {
      setMessage("복약 체크 상태를 바꾸지 못했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteGroup = async (group: DoseGroup) => {
    if (!session) {
      return;
    }

    const pending = group.items.filter((item) => !item.takenLogIds.length);
    if (!pending.length) {
      return;
    }

    setActionLoading(true);
    try {
      await Promise.all(
        pending.map((item) =>
          api.createIntakeLog(settings, session, {
            medicationScheduleId: item.scheduleId,
            medicationScheduleTimeId: item.scheduleTimeId,
            status: "TAKEN",
            scheduledAt: item.scheduledAt,
            takenAt: new Date().toISOString().slice(0, 19),
          })
        )
      );
      await loadIntakeLogs(items);
    } catch {
      setMessage("전체 완료 처리에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Screen>
        <SectionCard title="복약 캘린더" subtitle="날짜를 눌러 그날의 회차별 복약 목록을 확인하세요.">
          <View style={mobileStyles.calendarToolbar}>
            <Button title="이전 달" onPress={() => moveMonth(-1)} secondary />
            <Text style={mobileStyles.calendarMonthText}>
              {currentMonth.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
            </Text>
            <Button title="다음 달" onPress={() => moveMonth(1)} secondary />
          </View>

          <View style={mobileStyles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} style={mobileStyles.weekdayCell}>
                <Text style={mobileStyles.weekdayText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={mobileStyles.calendarGrid}>
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.isoDate;
              return (
                <Pressable
                  key={day.isoDate}
                  onPress={() => setSelectedDate(day.isoDate)}
                  style={[
                    mobileStyles.calendarDay,
                    !day.isCurrentMonth && mobileStyles.calendarDayMuted,
                    day.isToday && mobileStyles.calendarDayToday,
                    isSelected && mobileStyles.calendarDaySelected,
                  ]}
                >
                  <Text style={[mobileStyles.calendarDayNumber, day.isToday && mobileStyles.calendarDayNumberToday]}>
                    {day.dayNumber}
                  </Text>
                  <View style={mobileStyles.calendarDotRow}>
                    {day.schedules.slice(0, 3).map((schedule) => (
                      <View key={`${day.isoDate}-${schedule.id}`} style={mobileStyles.calendarDot} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard
          title={selectedDate}
          subtitle="선택한 날짜의 회차별 복약 목록입니다."
        >
          {loading ? (
            <Text style={mobileStyles.mutedText}>일정을 불러오는 중입니다.</Text>
          ) : doseGroups.length ? (
            <View style={{ gap: 10 }}>
              {doseGroups.map((group) => {
                const completedCount = group.items.filter((item) => item.takenLogIds.length).length;
                const isComplete = completedCount === group.items.length;

                return (
                    <View
                      key={group.key}
                      style={[
                        mobileStyles.doseCard,
                        isComplete ? mobileStyles.doseCardComplete : null,
                      ]}
                    >
                      <View style={mobileStyles.doseStatusRail}>
                        <View
                          style={[
                            mobileStyles.doseStatusIcon,
                            isComplete ? mobileStyles.doseStatusIconComplete : null,
                          ]}
                        >
                        <Text style={mobileStyles.doseStatusIconText}>{isComplete ? "✓" : "○"}</Text>
                      </View>
                    </View>

                    <View style={mobileStyles.doseBody}>
                      <View style={mobileStyles.doseHeader}>
                        <Text style={mobileStyles.doseTimeText}>{formatTimeLabel(group.takeTime)}</Text>
                        <Text style={mobileStyles.doseCountText}>
                          {completedCount}/{group.items.length}
                        </Text>
                      </View>

                      <View style={mobileStyles.doseChipWrap}>
                        {group.items.map((item) => (
                          <Pressable
                            key={`${group.key}-${item.scheduleId}-${item.scheduleTimeId}`}
                            onPress={() => handleToggleMedicine(item)}
                            disabled={actionLoading}
                            style={[
                              mobileStyles.doseChip,
                              item.takenLogIds.length ? mobileStyles.doseChipComplete : null,
                            ]}
                          >
                            <View
                              style={[
                                mobileStyles.doseChipDot,
                                item.takenLogIds.length ? mobileStyles.doseChipDotComplete : null,
                              ]}
                            />
                            <Text
                              style={[
                                mobileStyles.doseChipText,
                                item.takenLogIds.length ? mobileStyles.doseChipTextComplete : null,
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.takenLogIds.length ? (
                              <Text style={mobileStyles.doseChipMeta}>{formatTakenAt(item.takenAt) || "완료"}</Text>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>

                      <View style={mobileStyles.doseActionRow}>
                        <Pressable
                          onPress={() => handleCompleteGroup(group)}
                          disabled={actionLoading || isComplete}
                          style={[
                            mobileStyles.completeButton,
                            (actionLoading || isComplete) && mobileStyles.completeButtonDisabled,
                          ]}
                        >
                          <Text style={mobileStyles.completeButtonText}>전체 완료</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={mobileStyles.mutedText}>선택한 날짜에는 복약 일정이 없습니다.</Text>
          )}
        </SectionCard>

        {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
      </Screen>

      <Modal transparent visible={plusModalVisible} animationType="fade" onRequestClose={() => setPlusModalVisible(false)}>
        <Pressable onPress={() => setPlusModalVisible(false)} style={mobileStyles.modalBackdrop}>
          <Pressable onPress={() => {}} style={mobileStyles.modalCard}>
            <Text style={mobileStyles.modalTitle}>복약 일정 추가</Text>
            <Text style={mobileStyles.modalSubtitle}>원하는 방식으로 복약 일정을 등록하세요.</Text>
            <View style={mobileStyles.modalOptionsRow}>
              <Pressable onPress={() => {}} style={mobileStyles.modalOptionCard}>
                <Ionicons name="document-outline" size={28} color="#0f766e" />
                <Text style={mobileStyles.modalOptionTitle}>처방전 사진 업로드</Text>
                <Text style={mobileStyles.modalOptionText}>준비 중인 기능입니다.</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setPlusModalVisible(false);
                  navigation.navigate("ScheduleForm");
                }}
                style={[mobileStyles.modalOptionCard, mobileStyles.modalOptionCardPrimary]}
              >
                <Ionicons name="create-outline" size={28} color="#0f766e" />
                <Text style={mobileStyles.modalOptionTitle}>직접 입력하기</Text>
                <Text style={mobileStyles.modalOptionText}>약 이름과 복용 시간을 직접 등록합니다.</Text>
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
        subtitle="직접 입력으로 약 이름, 병원, 복용 기간과 시간을 등록할 수 있어요."
      >
        <Field label="약 이름" value={form.customMedicineName} onChangeText={(value) => setForm((prev) => ({ ...prev, customMedicineName: value }))} />
        <Field label="병원명" value={form.hospitalName} onChangeText={(value) => setForm((prev) => ({ ...prev, hospitalName: value }))} />
        <Field label="약국명" value={form.pharmacyName} onChangeText={(value) => setForm((prev) => ({ ...prev, pharmacyName: value }))} />
        <Field label="복용량" value={form.dosageAmount} onChangeText={(value) => setForm((prev) => ({ ...prev, dosageAmount: value }))} keyboardType="numeric" />
        <PillSelector options={dosageUnitOptions} value={form.dosageUnit} onChange={(value) => setForm((prev) => ({ ...prev, dosageUnit: value }))} />
        <Field label="하루 복용 횟수" value={form.timesPerDay} onChangeText={(value) => setForm((prev) => ({ ...prev, timesPerDay: value }))} keyboardType="numeric" />
        <Field label="총 복용 일수" value={form.durationDays} onChangeText={(value) => setForm((prev) => ({ ...prev, durationDays: value }))} keyboardType="numeric" />

        <Pressable onPress={() => setDatePickerTarget("prescribedDate")} style={mobileStyles.pickerField}>
          <Text style={mobileStyles.pickerLabel}>처방일</Text>
          <Text style={mobileStyles.pickerValue}>{form.prescribedDate || "날짜 선택"}</Text>
        </Pressable>
        <Pressable onPress={() => setDatePickerTarget("dispensedDate")} style={mobileStyles.pickerField}>
          <Text style={mobileStyles.pickerLabel}>조제일</Text>
          <Text style={mobileStyles.pickerValue}>{form.dispensedDate || "날짜 선택"}</Text>
        </Pressable>

        <Text style={mobileStyles.groupTitle}>복용 시간</Text>
        {timeSlots.map((slot, index) => (
          <View key={`slot-${index + 1}`} style={mobileStyles.slotCard}>
            <Text style={mobileStyles.slotTitle}>{`${index + 1}회차`}</Text>
            <Pressable onPress={() => setTimePickerIndex(index)} style={mobileStyles.pickerField}>
              <Text style={mobileStyles.pickerLabel}>시간</Text>
              <Text style={mobileStyles.pickerValue}>{slot.takeTime || "09:00"}</Text>
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

        {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title={editingId ? "수정 저장" : "일정 등록"} onPress={handleSave} loading={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="초기화" onPress={resetForm} secondary disabled={Boolean(editingId)} />
          </View>
        </View>
      </SectionCard>

      {Platform.OS === "android" && datePickerTarget ? (
        <DateTimePicker value={dateStringToDate(form[datePickerTarget])} mode="date" display="calendar" onChange={handleDateChange} />
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
        <Pressable onPress={closePickers} style={mobileStyles.modalBackdrop}>
          <Pressable onPress={() => {}} style={mobileStyles.modalCard}>
            <Text style={mobileStyles.modalTitle}>{datePickerTarget ? "날짜 선택" : "시간 선택"}</Text>

            {datePickerTarget ? (
              <DateTimePicker
                value={dateStringToDate(form[datePickerTarget])}
                mode="date"
                display="inline"
                themeVariant="light"
                accentColor="#0f766e"
                textColor="#10332b"
                style={mobileStyles.iosPicker}
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
                style={mobileStyles.iosTimePicker}
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

const mobileStyles = StyleSheet.create({
  mutedText: {
    color: "#547066",
    lineHeight: 22,
  },
  listItemCard: {
    borderWidth: 1,
    borderColor: "#d9e7e2",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    backgroundColor: "#fbfdfc",
  },
  listItemTitle: {
    color: "#10332b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  listItemMeta: {
    color: "#547066",
    lineHeight: 20,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf7f5",
  },
  calendarToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarMonthText: {
    color: "#10332b",
    fontSize: 18,
    fontWeight: "800",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekdayCell: {
    width: "13.2%",
    alignItems: "center",
  },
  weekdayText: {
    color: "#547066",
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  calendarDay: {
    width: "13.2%",
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d9e7e2",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarDayMuted: {
    opacity: 0.35,
  },
  calendarDayToday: {
    borderColor: "#0f766e",
  },
  calendarDaySelected: {
    borderColor: "#0f766e",
    backgroundColor: "#edf7f5",
  },
  calendarDayNumber: {
    color: "#10332b",
    fontWeight: "700",
  },
  calendarDayNumberToday: {
    color: "#0f766e",
    fontWeight: "800",
  },
  calendarDotRow: {
    flexDirection: "row",
    gap: 4,
    minHeight: 8,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0f766e",
  },
  doseCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d7e5f4",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  doseCardComplete: {
    borderColor: "#b9e1cd",
    backgroundColor: "#f8fffb",
  },
  doseStatusRail: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef4ff",
  },
  doseStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2f6fcb",
  },
  doseStatusIconComplete: {
    backgroundColor: "#11724d",
  },
  doseStatusIconText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  doseBody: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  doseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  doseTimeText: {
    color: "#10332b",
    fontSize: 20,
    fontWeight: "800",
  },
  doseCountText: {
    color: "#6a7c77",
    fontSize: 13,
    fontWeight: "700",
  },
  doseChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  doseChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfd7f7",
    backgroundColor: "#f9fbff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doseChipComplete: {
    borderColor: "#9fd6b5",
    backgroundColor: "#ebfaf1",
  },
  doseChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2f6fcb",
  },
  doseChipDotComplete: {
    backgroundColor: "#11724d",
  },
  doseChipText: {
    color: "#10332b",
    fontSize: 16,
    fontWeight: "800",
  },
  doseChipTextComplete: {
    color: "#185b3b",
  },
  doseChipMeta: {
    color: "#5d746c",
    fontSize: 11,
    fontWeight: "600",
  },
  doseActionRow: {
    flexDirection: "row",
  },
  completeButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#11724d",
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonDisabled: {
    opacity: 0.55,
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 51, 43, 0.28)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 28,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    color: "#10332b",
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#547066",
    lineHeight: 22,
  },
  modalOptionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalOptionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d9e7e2",
    padding: 16,
    gap: 8,
    backgroundColor: "#fbfdfc",
  },
  modalOptionCardPrimary: {
    borderColor: "#0f766e",
    backgroundColor: "#edf7f5",
  },
  modalOptionTitle: {
    color: "#10332b",
    fontSize: 16,
    fontWeight: "800",
  },
  modalOptionText: {
    color: "#547066",
    lineHeight: 20,
  },
  pickerField: {
    borderWidth: 1,
    borderColor: "#d9e7e2",
    borderRadius: 16,
    padding: 14,
    gap: 6,
    backgroundColor: "#ffffff",
  },
  pickerLabel: {
    color: "#35574e",
    fontWeight: "700",
  },
  pickerValue: {
    color: "#10332b",
    fontSize: 16,
    fontWeight: "700",
  },
  groupTitle: {
    color: "#35574e",
    fontWeight: "700",
    fontSize: 16,
  },
  slotCard: {
    borderWidth: 1,
    borderColor: "#d9e7e2",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  slotTitle: {
    color: "#10332b",
    fontWeight: "700",
  },
  iosPicker: {
    width: "100%",
    height: 360,
    backgroundColor: "#ffffff",
  },
  iosTimePicker: {
    width: "100%",
    height: 220,
    backgroundColor: "#ffffff",
  },
});
