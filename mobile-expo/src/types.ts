export type UserRole = "USER" | "PHARMACIST" | "ADMIN";
export type Gender = "MALE" | "FEMALE";
export type CautionType = "MEDICINE" | "INGREDIENT";
export type CautionReason =
  | "ALLERGY"
  | "SIDE_EFFECT"
  | "DOCTOR_ADVICE"
  | "PHARMACIST_ADVICE"
  | "PERSONAL_AVOID"
  | "OTHER";
export type DosageUnit = "ML" | "TABLET" | "MG" | "PACKET" | "SPOON";
export type FrequencyType = "DAILY" | "INTERVAL_HOURS" | "AS_NEEDED";
export type MedicationTiming =
  | "AFTER_MEAL"
  | "BEFORE_MEAL"
  | "WITH_MEAL"
  | "EMPTY_STOMACH"
  | "BEDTIME"
  | "ANYTIME";
export type MedicationIntakeStatus = "TAKEN" | "SKIPPED" | "MISSED";

export interface Session {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: UserRole;
}

export interface AppSettings {
  apiHost: string;
  apiBaseUrl?: string;
  presignedUploadUrlEndpoint: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: UserRole;
}

export interface MedicineSearchResponse {
  itemSeq: number;
  itemName: string;
  companyName: string | null;
  efficacy: string | null;
  useMethod: string | null;
  caution: string | null;
  sideEffect: string | null;
  imageUrl: string | null;
}

export interface CautionSuggestionResponse {
  name: string;
  type: CautionType;
}

export interface UserMedicationCautionRequest {
  itemSeq: number | null;
  itemName: string | null;
  ingredientCode: string | null;
  ingredientName: string | null;
  reason: CautionReason;
  memo: string | null;
}

export interface UserMedicationCautionResponse extends UserMedicationCautionRequest {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotMessageResponse {
  answer: string;
}

export interface MedicationScheduleResponse {
  id: number;
  userId: number;
  medicineId: number | null;
  customMedicineName: string | null;
  hospitalName: string | null;
  pharmacyName: string | null;
  dosageAmount: number | null;
  dosageUnit: DosageUnit | null;
  frequencyType: FrequencyType | null;
  timesPerDay: number | null;
  intervalHours: number | null;
  durationDays: number | null;
  startDate: string | null;
  endDate: string | null;
  dispensedDate: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  medicines?: MedicationScheduleMedicineResponse[];
}

export interface MedicationScheduleMedicineResponse {
  id: number;
  medicationScheduleId: number;
  medicineId: number | null;
  customMedicineName: string | null;
  dosageAmount: number | null;
  dosageUnit: DosageUnit | null;
  frequencyType: FrequencyType | null;
  timesPerDay: number | null;
  intervalHours: number | null;
  durationDays: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationScheduleTimeResponse {
  id: number;
  medicationScheduleId: number;
  medicationScheduleMedicineId: number;
  timing: MedicationTiming;
  takeTime: string;
  sortOrder: number;
}

export interface MedicationIntakeLogRequest {
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: MedicationIntakeStatus;
  scheduledAt: string;
  takenAt: string;
}

export interface MedicationIntakeLogResponse {
  id: number;
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: MedicationIntakeStatus;
  scheduledAt: string;
  takenAt: string;
  createdAt: string;
}

export interface PrescriptionUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface PrescriptionUploadUrlResponse {
  ocrResultId: number;
  uploadUrl: string;
  key: string;
  fileUrl?: string | null;
  headers?: Record<string, string> | null;
}

export interface PrescriptionOcrResponse {
  ocrResultId: number;
  imageKey: string;
  rawText: string;
  resultJson: string;
  ocrEngine: string;
  preprocessedImageDataUrl?: string | null;
  status: string;
  errorMessage: string | null;
}

export interface OcrMedicineDraft {
  name: string;
  dosage: string;
  frequency: string;
  days: string;
}

export interface OcrScheduleDraft {
  hospitalName: string;
  pharmacyName: string;
  dispensedDate: string;
  medicines: OcrMedicineDraft[];
}
