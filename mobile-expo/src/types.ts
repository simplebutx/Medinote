export type UserRole = "USER" | "PHARMACIST" | "ADMIN";
export type Gender = "MALE" | "FEMALE";
export type UserStatus =
  | "ACTIVE"
  | "PENDING"
  | "WAITING_APPROVAL"
  | "REJECTED"
  | string;

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: number;
  status?: UserStatus | null;
}

export interface AppSettings {
  authBaseUrl: string;
  medicationBaseUrl: string;
  consultationBaseUrl: string;
  aiBaseUrl: string;
}

export interface LoginResponse extends Session {}

export interface SignupResponse {
  userId: number;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserProfile {
  id?: number;
  userId?: number;
  email?: string;
  username?: string;
  birthDate?: string;
  gender?: Gender | string;
  role?: UserRole | string;
  status?: UserStatus;
  isPregnant?: boolean | null;
  isBreastfeeding?: boolean | null;
  isSmoking?: boolean | null;
  isDrinking?: boolean | null;
  isChild?: boolean | null;
  isElderly?: boolean | null;
  chronicDiseases?: string[];
  docNumber?: string | null;
  licenseNumber?: string | null;
  licenseImage?: string | null;
}

export type DosageUnit =
  | "TABLET"
  | "CAPSULE"
  | "PACK"
  | "PACKET"
  | "ML"
  | "MG"
  | "DROP"
  | "SPOON"
  | "OTHER";

export type MedicationTiming =
  | "AFTER_MEAL"
  | "BEFORE_MEAL"
  | "WITH_MEAL"
  | "EMPTY_STOMACH"
  | "BEDTIME"
  | "ANYTIME";

export type IntakeStatus = "TAKEN" | "SKIPPED" | "MISSED" | "PENDING";

export interface MedicationScheduleMedicine {
  id?: number;
  medicationScheduleId?: number;
  medicineId?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: number | null;
  dosageUnit?: DosageUnit | null;
  timesPerDay?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface MedicationSchedule {
  id: number;
  userId?: number;
  hospitalName?: string | null;
  pharmacyName?: string | null;
  prescribedDate?: string | null;
  dispensedDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  isActive?: boolean;
  medicines?: MedicationScheduleMedicine[];
  medicationScheduleMedicines?: MedicationScheduleMedicine[];
}

export interface MedicationScheduleTime {
  id: number;
  medicationScheduleMedicineId?: number;
  medicationScheduleId?: number;
  timing?: MedicationTiming;
  takeTime?: string;
  sortOrder?: number;
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
  timing?: MedicationTiming | null;
  takeTime?: string | null;
  intakeStatus?: IntakeStatus | null;
  scheduledAt?: string | null;
  takenAt?: string | null;
  hospitalName?: string | null;
  pharmacyName?: string | null;
}

export interface DailyMedicationGroup {
  takeTime: string;
  medications: DailyMedication[];
}

export interface DailyMedicationResponse {
  date: string;
  groups: DailyMedicationGroup[];
}

export interface MedicationIntakeLog {
  id: number;
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: IntakeStatus;
  scheduledAt: string;
  takenAt?: string | null;
}

export type CautionTargetType = "MEDICINE" | "INGREDIENT";
export type CautionReason =
  | "ALLERGY"
  | "SIDE_EFFECT"
  | "DOCTOR_ADVICE"
  | "PHARMACIST_ADVICE"
  | "PERSONAL_AVOID"
  | "OTHER";

export interface CautionItem {
  id: number;
  type: CautionTargetType | string;
  targetName: string;
  reason: CautionReason | string;
  memo?: string | null;
  createdAt?: string;
}

export interface CautionSuggestItem {
  type?: CautionTargetType | string;
  name?: string;
  targetName?: string;
  itemName?: string;
  ingredientName?: string;
}

export interface MedicineSearchItem {
  itemSeq?: number | string;
  itemName?: string;
  item_name?: string;
  companyName?: string;
  company_name?: string;
  ingredients?: string;
  efficacy?: string;
  useMethod?: string;
  warningBeforeUse?: string;
  caution?: string;
  interaction?: string;
  sideEffect?: string;
  storageMethod?: string;
  imageUrl?: string;
  warningMedicine?: boolean;
  warningIngredient?: boolean;
}

export interface ChatbotRoom {
  roomId: number;
  userId?: number | null;
  title?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ChatbotMessage {
  messageId?: number | null;
  answer?: string | null;
  answerType?: string | null;
  roomId?: number | null;
  senderType?: "USER" | "BOT" | string | null;
  content?: string | null;
  createdAt?: string | null;
}

export type ConsultRoomStatus =
  | "PENDING"
  | "MATCHED"
  | "ACTIVE"
  | "COMPLETED"
  | "CLOSED"
  | string;

export interface ConsultRoom {
  roomId: number;
  customerId?: number;
  customId?: number;
  pharmacistId?: number | null;
  status?: ConsultRoomStatus;
  createdAt?: string;
  firstMessage?: string;
  customerName?: string;
  aiConsultationSummary?: string | null;
  rating?: number | null;
  feedbackComment?: string | null;
  comment?: string;
}

export interface ConsultMessage {
  messageId?: number;
  roomId?: number;
  senderId?: number;
  senderType?: "USER" | "PHARMACIST" | string;
  message?: string;
  content?: string;
  createdAt?: string;
}

export interface ConsultPatientInfo {
  userId?: number;
  customerId?: number;
  username?: string;
  customerName?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  isSmoking?: boolean;
  isDrinking?: boolean;
  chronicDiseases?: string[];
  medicationSchedules?: unknown[];
}

export interface ConsultFeedbackStats {
  averageRating?: number;
  reviewCount?: number;
  totalCount?: number;
}

export interface Pharmacy {
  hpid: string;
  name?: string | null;
  pharmacyName?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mondayOpen?: string | null;
  mondayClose?: string | null;
  tuesdayOpen?: string | null;
  tuesdayClose?: string | null;
  wednesdayOpen?: string | null;
  wednesdayClose?: string | null;
  thursdayOpen?: string | null;
  thursdayClose?: string | null;
  fridayOpen?: string | null;
  fridayClose?: string | null;
  saturdayOpen?: string | null;
  saturdayClose?: string | null;
  sundayOpen?: string | null;
  sundayClose?: string | null;
  holidayOpen?: string | null;
  holidayClose?: string | null;
  description?: string | null;
  extraInfo?: string | null;
}

export interface PharmacyInventory {
  id?: number;
  inventoryId?: number;
  pharmacyHpid?: string;
  itemSeq?: string;
  itemName?: string;
  companyName?: string | null;
  stockQuantity?: number;
}

export interface NotificationItem {
  id: number;
  title?: string;
  message?: string;
  content?: string;
  type?: string;
  status?: string;
  read?: boolean;
  createdAt?: string;
  roomId?: number;
}

export interface PrescriptionUploadUrlResponse {
  ocrResultId: number;
  uploadUrl: string;
  objectKey?: string;
  headers?: Record<string, string>;
}

export interface PrescriptionOcrResponse {
  ocrResultId?: number;
  status?: string;
  extractedText?: string;
  medicines?: Array<{
    medicineName?: string;
    dosageAmount?: number;
    dosageUnit?: DosageUnit;
    timesPerDay?: number;
    durationDays?: number;
  }>;
}

export interface AdminStats {
  totalUserCount: number;
  totalPharmacistCount: number;
  pendingPharmacistCount: number;
}

export interface AdminUser {
  id: number;
  userId?: number;
  email: string;
  username: string;
  role: UserRole | string;
  status: UserStatus;
  birthDate?: string | null;
  gender?: string | null;
  createdAt?: string | null;
}

export interface PendingPharmacist {
  userId: number;
  email: string;
  username: string;
  docNumber?: string | null;
  licenseNumber?: string | null;
  licenseImage?: string | null;
}
