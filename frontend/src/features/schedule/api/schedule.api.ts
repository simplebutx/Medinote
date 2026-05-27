import { medicationInstance } from "../../../api/axiosInstance";
import type {
  MedicationIntakeLog,
  MedicationSchedule,
  MedicationScheduleTime,
} from "../types/schedule.types";

export const getMedicationSchedules = async () => {
  const response = await medicationInstance.get<MedicationSchedule[]>(
    "/api/medication-schedules"
  );

  return response.data;
};

export const getMedicationScheduleTimes = async (
  medicationScheduleId: number
) => {
  const response = await medicationInstance.get<MedicationScheduleTime[]>(
    "/api/medication-schedule-times",
    {
      params: {
        medicationScheduleId,
      },
    }
  );

  return response.data;
};

export const getMedicationScheduleTimesByScheduleIds = async (
  medicationScheduleIds: number[],
) => {
  const results = await Promise.all(
    medicationScheduleIds.map((id) => getMedicationScheduleTimes(id)),
  );

  return results.flat();
};

export const getMedicationIntakeLogs = async (
  medicationScheduleId: number
) => {
  const response = await medicationInstance.get<MedicationIntakeLog[]>(
    "/api/medication-intake-logs",
    {
      params: {
        medicationScheduleId,
      },
    }
  );

  return response.data;
};

export const getMedicationIntakeLogsByScheduleIds = async (
  medicationScheduleIds: number[],
) => {
  const results = await Promise.all(
    medicationScheduleIds.map((id) => getMedicationIntakeLogs(id)),
  );

  return results.flat();
};

export const createMedicationIntakeLog = async (body: {
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: "TAKEN" | "SKIPPED" | "MISSED";
  scheduledAt: string;
  takenAt?: string | null;
}) => {
  const response = await medicationInstance.post<MedicationIntakeLog>(
    "/api/medication-intake-logs",
    body
  );

  return response.data;
};

export const deleteMedicationIntakeLog = async (id: number) => {
  await medicationInstance.delete(`/api/medication-intake-logs/${id}`);
};

export const updateMedicationIntakeLog = async (
  id: number,
  body: {
    medicationScheduleId: number;
    medicationScheduleTimeId: number;
    status: "TAKEN" | "SKIPPED" | "MISSED";
    scheduledAt: string;
    takenAt?: string | null;
  },
) => {
  const response = await medicationInstance.put<MedicationIntakeLog>(
    `/api/medication-intake-logs/${id}`,
    body,
  );

  return response.data;
};