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

export type MedicationTiming =
  | "AFTER_MEAL"
  | "BEFORE_MEAL"
  | "WITH_MEAL"
  | "EMPTY_STOMACH"
  | "BEDTIME"
  | "ANYTIME";

export type IntakeStatus = "TAKEN" | "SKIPPED" | "MISSED";

/**
 * 최신 DB 구조 기준:
 * medication_schedule 1개 아래에 여러 medication_schedule_medicine이 들어감.
 */
export interface MedicationScheduleMedicine {
  id: number;
  medicationScheduleId: number;
  medicineId?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  timesPerDay?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 최신 구조 기준의 복약 일정.
 * 단, 기존 SchedulePage 호환을 위해 medicineId/customMedicineName 같은 납작한 필드도 optional로 유지.
 */
export interface MedicationSchedule {
  id: number;
  userId: number;

  hospitalName?: string | null;
  pharmacyName?: string | null;
  prescribedDate?: string | null;
  dispensedDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  /**
   * 최신 응답 후보 필드.
   * 백엔드 응답명이 medicines 또는 medicationScheduleMedicines 중 어떤 형태인지
   * 확정 전까지 둘 다 허용.
   */
  medicines?: MedicationScheduleMedicine[];
  medicationScheduleMedicines?: MedicationScheduleMedicine[];

  /**
   * 이전 구조 호환용 필드.
   * SchedulePage 기존 코드가 아직 이 필드를 참조할 수 있으므로 당장 삭제하지 않음.
   */
  medicineId?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  timesPerDay?: number | null;
}

export interface MedicationScheduleTime {
  id: number;

  /**
   * 최신 구조에서는 medicationScheduleMedicineId가 핵심 FK.
   */
  medicationScheduleMedicineId?: number;

  /**
   * 기존 조회/복용기록 로직 호환용.
   * 현재 복용 기록 API는 medicationScheduleId + medicationScheduleTimeId를 사용 중.
   */
  medicationScheduleId?: number;

  timing: MedicationTiming;
  takeTime: string;
  sortOrder: number;
}

export interface MedicationIntakeLog {
  id: number;
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: IntakeStatus;
  scheduledAt: string;
  takenAt?: string | null;
  createdAt?: string;
}

export interface DailyMedication {
  medicationScheduleId?: number;
  medicationScheduleMedicineId?: number;
  medicationScheduleTimeId?: number;
  medicationIntakeLogId?: number | null;
  medicineId?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  timesPerDay?: number | null;
  timing?: MedicationTiming | null;
  takeTime?: string | null;
  intakeStatus?: IntakeStatus | "PENDING" | null;
  scheduledAt?: string | null;
  takenAt?: string | null;
  hospitalName?: string | null;
  pharmacyName?: string | null;
}

export interface DailyMedicationScheduleGroup {
  takeTime: string;
  medications: DailyMedication[];
}

export interface DailyMedicationScheduleResponse {
  date: string;
  groups: DailyMedicationScheduleGroup[];
}

/**
 * 최신 복약 일정 등록 request.
 * medication_schedule 1개 + medicines[] 여러 개를 한 번에 생성.
 */
export interface CreateMedicationScheduleMedicineRequest {
  medicineId?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  timesPerDay?: number | null;
  durationDays?: number | null;
}

export interface CreateMedicationScheduleRequest {
  hospitalName?: string | null;
  pharmacyName?: string | null;
  dispensedDate?: string | null;
  startDate: string;
  durationDays: number;
  medicines: CreateMedicationScheduleMedicineRequest[];
}
/**
 * 최신 복약 시간 등록 request.
 * 예전 medicationScheduleId가 아니라 medicationScheduleMedicineId 기준.
 */
export interface CreateMedicationScheduleTimeRequest {
  medicationScheduleMedicineId: number;
  timing: MedicationTiming;
  takeTime: string;
  sortOrder: number;
}

export interface MedicationTimePresetSlot {
  sortOrder: number;
  takeTime: string;
}

export interface MedicationTimePreset {
  timesPerDay: number;
  slots: MedicationTimePresetSlot[];
}

export interface UpdateMedicationTimePresetsRequest {
  presets: MedicationTimePreset[];
}