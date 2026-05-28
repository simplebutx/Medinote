export type DosageUnit =
  | "TABLET"
  | "CAPSULE"
  | "PACK"
  | "ML"
  | "MG"
  | "DROP"
  | "OTHER";

export type FrequencyType =
  | "DAILY"
  | "INTERVAL_HOURS"
  | "SPECIFIC_DAYS"
  | "AS_NEEDED";

export interface MedicationSchedule {
  id: number;
  userId: number;
  medicineId?: number | null;
  customMedicineName?: string | null;
  hospitalName?: string | null;
  pharmacyName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  frequencyType?: FrequencyType | null;
  timesPerDay?: number | null;
  intervalHours?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  prescribedDate?: string | null;
  dispensedDate?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MedicationTiming =
  | "AFTER_MEAL"
  | "BEFORE_MEAL"
  | "WITH_MEAL"
  | "EMPTY_STOMACH"
  | "BEDTIME"
  | "ANYTIME";

export interface MedicationScheduleTime {
  id: number;
  medicationScheduleId: number;
  timing: MedicationTiming;
  takeTime: string;
  sortOrder: number;
}

export type IntakeStatus = "TAKEN" | "SKIPPED" | "MISSED";

export interface MedicationIntakeLog {
  id: number;
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: IntakeStatus;
  scheduledAt: string;
  takenAt?: string | null;
  createdAt?: string;
}

export interface CreateMedicationScheduleRequest {
  medicineId?: number | null;
  customMedicineName?: string | null;
  hospitalName?: string | null;
  pharmacyName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  frequencyType?: FrequencyType | null;
  timesPerDay?: number | null;
  intervalHours?: number | null;
  durationDays?: number | null;
  prescribedDate?: string | null;
  dispensedDate?: string | null;
}

export interface CreateMedicationScheduleTimeRequest {
  medicationScheduleId: number;
  timing: MedicationTiming;
  takeTime: string;
  sortOrder: number;
}