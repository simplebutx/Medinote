import type { MedicationScheduleResponse } from "./types";

export function trimText(text: string | null | undefined) {
  if (!text) {
    return "-";
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized || "-";
}

export function formatScheduleLabel(schedule: MedicationScheduleResponse) {
  const name = schedule.customMedicineName || `약 #${schedule.medicineId ?? "-"}`;
  const amount = schedule.dosageAmount
    ? `${schedule.dosageAmount}${schedule.dosageUnit ?? ""}`
    : "-";

  return `${name} · 하루 ${schedule.timesPerDay ?? 0}회 · ${amount}`;
}

export function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}
