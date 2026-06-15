import { medicationInstance } from "../../../api/axiosInstance";
import type {
  CreateMedicationScheduleRequest,
  MedicationIntakeLog,
  MedicationSchedule,
  MedicationScheduleTime,
  CreateMedicationScheduleTimeRequest,
  DailyMedicationScheduleResponse,
  MedicationTimePreset,
  PrescriptionAnalysisResponse,
  UpdateMedicationTimePresetsRequest,
} from "../types/schedule.types";

export const getMedicationTimePresets = async () => {
  const response = await medicationInstance.get<MedicationTimePreset[]>(
    "/api/me/medication-time-presets",
  );

  return response.data;
};

export const updateMedicationTimePresets = async (
  body: UpdateMedicationTimePresetsRequest,
) => {
  const response = await medicationInstance.put<MedicationTimePreset[]>(
    "/api/me/medication-time-presets",
    body,
  );

  return response.data;
};

export const getMedicationSchedules = async () => {
  const response = await medicationInstance.get<MedicationSchedule[]>(
    "/api/medication-schedules"
  );

  return response.data;
};

export const getDailyMedicationSchedules = async (date: string) => {
  const response = await medicationInstance.get<DailyMedicationScheduleResponse>(
    "/api/medication-schedules/daily",
    {
      params: {
        date,
      },
    },
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

export const createMedicationSchedule = async (
  body: CreateMedicationScheduleRequest,
) => {
  const response = await medicationInstance.post<MedicationSchedule>(
    "/api/medication-schedules",
    body,
  );

  return response.data;
};

export const createMedicationScheduleTime = async (
  body: CreateMedicationScheduleTimeRequest,
) => {
  const response = await medicationInstance.post<MedicationScheduleTime>(
    "/api/medication-schedule-times",
    body,
  );

  return response.data;
};

export const updateMedicationSchedule = async (
  id: number,
  body: CreateMedicationScheduleRequest,
) => {
  const response = await medicationInstance.put<MedicationSchedule>(
    `/api/medication-schedules/${id}`,
    body,
  );

  return response.data;
};

export const deleteMedicationSchedule = async (id: number) => {
  await medicationInstance.delete(`/api/medication-schedules/${id}`);
};

export const deleteMedicationScheduleTime = async (id: number) => {
  await medicationInstance.delete(`/api/medication-schedule-times/${id}`);
};

export const analyzePrescription = async (scheduleId: number) => {
  const response = await medicationInstance.post<PrescriptionAnalysisResponse>(
    `/api/prescriptions/${scheduleId}/analysis`,
  );

  return response.data;
};
