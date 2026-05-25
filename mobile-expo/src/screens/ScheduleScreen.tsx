import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { api } from "../api/client";
import { dosageUnitOptions, timingOptions } from "../constants";
import { useAppContext } from "../context/AppContext";
import type { MedicationScheduleResponse, MedicationScheduleTimeResponse, MedicationTiming } from "../types";
import { formatScheduleLabel, todayDateInput } from "../utils";
import { Button, Field, InfoBanner, PillSelector, Screen, SectionCard } from "../ui";

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

export function ScheduleScreen() {
  const { settings, session } = useAppContext();
  const [items, setItems] = useState<MedicationScheduleResponse[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(createDefaultForm());
  const [timeSlots, setTimeSlots] = useState(createTimeSlots(3));

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

  const loadSchedules = async () => {
    if (!session) return;

    try {
      const response = await api.getSchedules(settings, session);
      setItems(response);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "복약 일정을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(createDefaultForm());
    setTimeSlots(createTimeSlots(3));
  };

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
    if (!session) return;

    setLoading(true);
    setMessage("");

    try {
      const schedule = editingId
        ? await api.updateSchedule(settings, session, editingId, buildPayload())
        : await api.createSchedule(settings, session, buildPayload());

      const existingTimes = editingId ? await api.getScheduleTimes(settings, session, schedule.id) : [];

      await Promise.all(
        existingTimes.map((time) => api.deleteScheduleTime(settings, session, time.id))
      );

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

      setMessage(editingId ? "복약 일정을 수정했습니다." : "복약 일정을 등록했습니다.");
      resetForm();
      await loadSchedules();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "복약 일정 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (item: MedicationScheduleResponse) => {
    if (!session) return;

    try {
      const times = await api.getScheduleTimes(settings, session, item.id);
      const ordered = [...times].sort((a, b) => a.sortOrder - b.sortOrder);

      setEditingId(item.id);
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
              takeTime: time.takeTime,
              timing: time.timing,
              sortOrder: time.sortOrder,
            }))
          : createTimeSlots(item.timesPerDay || 1)
      );
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "일정 상세 조회에 실패했습니다.");
    }
  };

  const handleDelete = async (item: MedicationScheduleResponse) => {
    if (!session) return;

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
      setMessage(error?.response?.data?.message || "복약 일정 삭제에 실패했습니다.");
    }
  };

  return (
    <Screen>
      <SectionCard title="복약 일정 등록" subtitle="웹 테스트 페이지에서 만들었던 등록/수정 흐름을 모바일 한 화면으로 묶었습니다.">
        <Field label="약 이름" value={form.customMedicineName} onChangeText={(value) => setForm((prev) => ({ ...prev, customMedicineName: value }))} />
        <Field label="병원명" value={form.hospitalName} onChangeText={(value) => setForm((prev) => ({ ...prev, hospitalName: value }))} />
        <Field label="약국명" value={form.pharmacyName} onChangeText={(value) => setForm((prev) => ({ ...prev, pharmacyName: value }))} />
        <Field label="복용량" value={form.dosageAmount} onChangeText={(value) => setForm((prev) => ({ ...prev, dosageAmount: value }))} keyboardType="numeric" />
        <PillSelector options={dosageUnitOptions} value={form.dosageUnit} onChange={(value) => setForm((prev) => ({ ...prev, dosageUnit: value }))} />
        <Field label="하루 복용 횟수" value={form.timesPerDay} onChangeText={(value) => setForm((prev) => ({ ...prev, timesPerDay: value }))} keyboardType="numeric" />
        <Field label="총 복용 일수" value={form.durationDays} onChangeText={(value) => setForm((prev) => ({ ...prev, durationDays: value }))} keyboardType="numeric" />
        <Field label="처방일" value={form.prescribedDate} onChangeText={(value) => setForm((prev) => ({ ...prev, prescribedDate: value }))} placeholder="YYYY-MM-DD" />
        <Field label="조제일" value={form.dispensedDate} onChangeText={(value) => setForm((prev) => ({ ...prev, dispensedDate: value }))} placeholder="YYYY-MM-DD" />

        <Text style={{ color: "#35574e", fontWeight: "700", fontSize: 16 }}>복용 시간</Text>
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
            <Text style={{ color: "#10332b", fontWeight: "700" }}>{index + 1}회차</Text>
            <Field
              label="시간"
              value={slot.takeTime}
              onChangeText={(value) =>
                setTimeSlots((prev) =>
                  prev.map((target, slotIndex) =>
                    slotIndex === index ? { ...target, takeTime: value } : target
                  )
                )
              }
              placeholder="08:00"
            />
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
            <Button title="초기화" onPress={resetForm} secondary />
          </View>
        </View>
      </SectionCard>

      {items.map((item) => (
        <SectionCard key={item.id} title={formatScheduleLabel(item)} subtitle={`${item.startDate || "-"} ~ ${item.endDate || "-"}`}>
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            {item.hospitalName || "병원 미입력"} · {item.pharmacyName || "약국 미입력"}
          </Text>
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            처방일 {item.prescribedDate || "-"} / 조제일 {item.dispensedDate || "-"}
          </Text>
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            상태: {item.isActive ? "활성" : "비활성 또는 계산 전"}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="수정" onPress={() => handleEdit(item)} secondary />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="삭제" onPress={() => handleDelete(item)} />
            </View>
          </View>
        </SectionCard>
      ))}
    </Screen>
  );
}
