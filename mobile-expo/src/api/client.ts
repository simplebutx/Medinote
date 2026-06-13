import axios, { AxiosError, type AxiosRequestConfig, type Method } from "axios";

import type {
  AdminStats,
  AdminUser,
  AppSettings,
  CautionItem,
  CautionReason,
  CautionSuggestItem,
  CautionTargetType,
  ChatbotMessage,
  ChatbotRoom,
  ConsultFeedbackStats,
  ConsultMessage,
  ConsultPatientInfo,
  ConsultRoom,
  DailyMedicationResponse,
  Gender,
  LoginResponse,
  MedicineSearchItem,
  MedicationIntakeLog,
  MedicationSchedule,
  MedicationScheduleTime,
  NotificationItem,
  PendingPharmacist,
  Pharmacy,
  PharmacyInventory,
  PrescriptionOcrResponse,
  PrescriptionUploadUrlResponse,
  Session,
  SignupResponse,
  UserProfile,
  UserRole,
} from "../types";

type ServiceName = "auth" | "medication" | "consultation" | "ai";

type RequestOptions = {
  method?: Method;
  data?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  session?: Session | null;
  timeout?: number;
  headers?: Record<string, string>;
};

function getBaseUrl(settings: AppSettings, service: ServiceName) {
  if (service === "auth") return settings.authBaseUrl;
  if (service === "medication") return settings.medicationBaseUrl;
  if (service === "consultation") return settings.consultationBaseUrl;
  return settings.aiBaseUrl;
}

async function request<T>(
  settings: AppSettings,
  service: ServiceName,
  path: string,
  options: RequestOptions = {}
) {
  const config: AxiosRequestConfig = {
    baseURL: getBaseUrl(settings, service),
    url: path,
    method: options.method ?? "GET",
    data: options.data,
    params: options.params,
    timeout: options.timeout ?? 50000,
    headers: {
      ...(options.session?.accessToken
        ? { Authorization: `Bearer ${options.session.accessToken}` }
        : {}),
      ...options.headers,
    },
  };

  const response = await axios.request<T>(config);
  return response.data;
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as unknown;
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data === "object" && data !== null) {
      const maybe = data as { message?: string; error?: string };
      return maybe.message || maybe.error || error.message;
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return "요청 중 오류가 발생했습니다.";
}

function isOptionalError(error: unknown) {
  return axios.isAxiosError(error) && [404, 500].includes(error.response?.status ?? 0);
}

function buildFormFile(uri: string, name: string, type: string) {
  return { uri, name, type } as unknown as Blob;
}

export const api = {
  login(settings: AppSettings, email: string, password: string) {
    return request<LoginResponse>(settings, "auth", "/api/auth/login", {
      method: "POST",
      data: { email, password },
    });
  },

  signup(
    settings: AppSettings,
    payload: {
      email: string;
      password: string;
      username: string;
      birthDate: string;
      gender: Gender;
      role: UserRole;
    }
  ) {
    return request<SignupResponse>(settings, "auth", "/api/auth/signup", {
      method: "POST",
      data: payload,
    });
  },

  sendEmailCode(settings: AppSettings, email: string) {
    return request<{ message?: string; expiresInSeconds?: number }>(
      settings,
      "auth",
      "/api/auth/email/verification-code",
      { method: "POST", data: { email } }
    );
  },

  verifyEmailCode(settings: AppSettings, email: string, code: string) {
    return request<{ message: string; verified: boolean }>(
      settings,
      "auth",
      "/api/auth/email/verify",
      { method: "POST", data: { email, code } }
    );
  },

  sendSmsCode(settings: AppSettings, phoneNumber: string) {
    return request<{ message?: string }>(settings, "auth", "/api/auth/sms/send", {
      method: "POST",
      data: { phoneNumber },
    });
  },

  verifySmsCode(settings: AppSettings, phoneNumber: string, code: string) {
    return request<boolean>(settings, "auth", "/api/auth/sms/verify", {
      method: "POST",
      data: { phoneNumber, code },
    });
  },

  submitUserAdditionalInfo(
    settings: AppSettings,
    session: Session | null,
    payload: {
      email: string;
      isPregnant: boolean;
      isBreastfeeding: boolean;
      isSmoking: boolean;
      isDrinking: boolean;
      isChild?: boolean;
      isElderly?: boolean;
      diseaseNames: string[];
    }
  ) {
    return request<{ userId?: number; status?: string }>(settings, "auth", "/api/auth/user/profile", {
      method: "POST",
      session,
      data: payload,
    });
  },

  requestPharmacistVerification(
    settings: AppSettings,
    session: Session | null,
    payload: {
      email: string;
      docNumber: string;
      licenseNumber: string;
      licenseImageUri?: string | null;
    }
  ) {
    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        email: payload.email,
        docNumber: payload.docNumber,
        licenseNumber: payload.licenseNumber,
      })
    );
    if (payload.licenseImageUri) {
      formData.append(
        "licenseImage",
        buildFormFile(payload.licenseImageUri, "license.jpg", "image/jpeg")
      );
    }

    return request<{ userId?: number; status?: string }>(
      settings,
      "auth",
      "/api/auth/pharmacists/verification",
      {
        method: "POST",
        session,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  logout(settings: AppSettings, session: Session) {
    return request<{ message?: string }>(settings, "auth", "/api/auth/logout", {
      method: "POST",
      session,
    });
  },

  getMyProfile(settings: AppSettings, session: Session) {
    return request<UserProfile>(settings, "auth", "/api/auth/me", { session });
  },

  updateMyProfile(settings: AppSettings, session: Session, payload: Partial<UserProfile>) {
    return request<string | UserProfile>(settings, "auth", "/api/auth/me", {
      method: "PATCH",
      session,
      data: payload,
    });
  },

  suggestDiseases(settings: AppSettings, keyword: string) {
    return request<string[]>(settings, "auth", "/api/auth/diseases/suggest", {
      params: { keyword },
    });
  },

  withdrawAccount(settings: AppSettings, session: Session) {
    return request<string>(settings, "auth", "/api/auth/me", {
      method: "DELETE",
      session,
    });
  },

  suggestMedicines(settings: AppSettings, keyword: string) {
    return request<string[]>(settings, "medication", "/api/medicines/suggest", {
      method: "POST",
      params: { keyword },
    });
  },

  async searchMedicines(settings: AppSettings, keyword: string) {
    const data = await request<MedicineSearchItem | MedicineSearchItem[]>(
      settings,
      "medication",
      "/api/medicines/search",
      { params: { keyword } }
    );
    return Array.isArray(data) ? data : data ? [data] : [];
  },

  getMedicationTimePresets(settings: AppSettings, session: Session) {
    return request(settings, "medication", "/api/me/medication-time-presets", { session });
  },

  getSchedules(settings: AppSettings, session: Session) {
    return request<MedicationSchedule[]>(settings, "medication", "/api/medication-schedules", {
      session,
    });
  },

  getDailySchedules(settings: AppSettings, session: Session, date: string) {
    return request<DailyMedicationResponse>(
      settings,
      "medication",
      "/api/medication-schedules/daily",
      { session, params: { date } }
    );
  },

  createSchedule(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<MedicationSchedule>(settings, "medication", "/api/medication-schedules", {
      method: "POST",
      session,
      data,
    });
  },

  updateSchedule(
    settings: AppSettings,
    session: Session,
    id: number,
    data: Record<string, unknown>
  ) {
    return request<MedicationSchedule>(settings, "medication", `/api/medication-schedules/${id}`, {
      method: "PUT",
      session,
      data,
    });
  },

  deleteSchedule(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/medication-schedules/${id}`, {
      method: "DELETE",
      session,
    });
  },

  getScheduleTimes(settings: AppSettings, session: Session, medicationScheduleId: number) {
    return request<MedicationScheduleTime[]>(
      settings,
      "medication",
      "/api/medication-schedule-times",
      { session, params: { medicationScheduleId } }
    );
  },

  createScheduleTime(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<MedicationScheduleTime>(
      settings,
      "medication",
      "/api/medication-schedule-times",
      { method: "POST", session, data }
    );
  },

  createIntakeLog(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<MedicationIntakeLog>(
      settings,
      "medication",
      "/api/medication-intake-logs",
      { method: "POST", session, data }
    );
  },

  getCautions(settings: AppSettings, session: Session) {
    return request<CautionItem[]>(settings, "medication", "/api/me/cautions", { session });
  },

  createCaution(
    settings: AppSettings,
    session: Session,
    data: {
      type: CautionTargetType;
      targetName: string;
      reason: CautionReason;
      memo?: string;
    }
  ) {
    return request<CautionItem>(settings, "medication", "/api/me/cautions", {
      method: "POST",
      session,
      data,
    });
  },

  updateCaution(
    settings: AppSettings,
    session: Session,
    id: number,
    data: {
      type: CautionTargetType;
      targetName: string;
      reason: CautionReason;
      memo?: string;
    }
  ) {
    return request<CautionItem>(settings, "medication", `/api/me/cautions/${id}`, {
      method: "PATCH",
      session,
      data,
    });
  },

  deleteCaution(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/me/cautions/${id}`, {
      method: "DELETE",
      session,
    });
  },

  suggestCautions(
    settings: AppSettings,
    keyword: string,
    type: CautionTargetType
  ) {
    return request<CautionSuggestItem[]>(settings, "medication", "/api/me/cautions/suggest", {
      method: "POST",
      params: { keyword, type },
    });
  },

  createPrescriptionUploadUrl(
    settings: AppSettings,
    session: Session,
    data: { filename: string; contentType: string }
  ) {
    return request<PrescriptionUploadUrlResponse>(
      settings,
      "medication",
      "/api/prescriptions/upload-url",
      { method: "POST", session, data }
    );
  },

  async uploadToPresignedUrl(
    uploadUrl: string,
    uri: string,
    contentType: string,
    headers?: Record<string, string>
  ) {
    const response = await fetch(uri);
    const blob = await response.blob();
    await axios.put(uploadUrl, blob, {
      headers: {
        "Content-Type": contentType,
        ...headers,
      },
      timeout: 60000,
    });
  },

  runPrescriptionOcr(settings: AppSettings, session: Session, ocrResultId: number) {
    return request<PrescriptionOcrResponse>(
      settings,
      "medication",
      `/api/prescriptions/${ocrResultId}/ocr`,
      { method: "POST", session, timeout: 120000 }
    );
  },

  getChatbotRooms(settings: AppSettings, session: Session) {
    return request<ChatbotRoom[]>(settings, "consultation", "/api/chatbot/rooms", {
      session,
    });
  },

  createChatbotRoom(settings: AppSettings, session: Session, title?: string) {
    return request<ChatbotRoom>(settings, "consultation", "/api/chatbot/rooms", {
      method: "POST",
      session,
      data: title ? { title } : {},
    });
  },

  getChatbotMessages(settings: AppSettings, session: Session, roomId: number) {
    return request<ChatbotMessage[]>(
      settings,
      "consultation",
      `/api/chatbot/rooms/${roomId}/messages`,
      { session }
    );
  },

  sendChatbotMessage(
    settings: AppSettings,
    session: Session,
    data: { roomId: number; message: string }
  ) {
    return request<ChatbotMessage>(settings, "consultation", "/api/chatbot/message", {
      method: "POST",
      session,
      data,
      timeout: 120000,
    });
  },

  getMyConsultRooms(settings: AppSettings, session: Session) {
    return request<ConsultRoom[]>(settings, "consultation", "/app/consult/rooms/my", {
      session,
    });
  },

  createConsultRoom(settings: AppSettings, session: Session) {
    return request<number | string | { roomId?: number; id?: number }>(
      settings,
      "consultation",
      "/app/consult/room",
      { method: "POST", session }
    );
  },

  getPendingConsultRooms(settings: AppSettings, session: Session) {
    return request<ConsultRoom[]>(settings, "consultation", "/app/consult/rooms/pending", {
      session,
    });
  },

  getActiveConsultRooms(settings: AppSettings, session: Session) {
    return request<ConsultRoom[]>(settings, "consultation", "/app/consult/rooms/active", {
      session,
    });
  },

  getCompletedConsultRooms(settings: AppSettings, session: Session) {
    return request<ConsultRoom[]>(settings, "consultation", "/app/consult/rooms/completed", {
      session,
    });
  },

  matchConsultRoom(settings: AppSettings, session: Session, roomId: number) {
    return request<string>(settings, "consultation", `/app/consult/room/${roomId}/match`, {
      method: "POST",
      session,
    });
  },

  closeConsultRoom(settings: AppSettings, session: Session, roomId: number) {
    return request<string | void>(
      settings,
      "consultation",
      `/app/consult/room/${roomId}/close`,
      { method: "PATCH", session }
    );
  },

  getConsultMessages(settings: AppSettings, session: Session, roomId: number) {
    return request<ConsultMessage[]>(
      settings,
      "consultation",
      `/app/consult/room/${roomId}/messages`,
      { session }
    );
  },

  getConsultPatientInfo(settings: AppSettings, session: Session, roomId: number) {
    return request<ConsultPatientInfo>(
      settings,
      "consultation",
      `/app/consult/room/${roomId}/patient-info`,
      { session }
    );
  },

  getConsultFeedbackStats(settings: AppSettings, session: Session) {
    return request<ConsultFeedbackStats>(
      settings,
      "consultation",
      "/app/consult/rooms/feedback-stats",
      { session }
    );
  },

  generateConsultSummary(settings: AppSettings, session: Session, roomId: number) {
    return request<string>(
      settings,
      "consultation",
      `/app/consult/room/${roomId}/summary`,
      { method: "POST", session, timeout: 120000 }
    );
  },

  async getNotifications(settings: AppSettings, session: Session, role: UserRole) {
    try {
      const medication = await request<NotificationItem[]>(
        settings,
        "medication",
        "/api/medication-notifications",
        { session }
      );
      if (role === "USER") return medication.map((item) => ({ ...item, type: item.type ?? "MEDICATION" }));
      const consultation = await request<NotificationItem[]>(
        settings,
        "consultation",
        "/api/consultation-notifications",
        { session }
      );
      return [
        ...medication.map((item) => ({ ...item, type: item.type ?? "MEDICATION" })),
        ...consultation.map((item) => ({ ...item, type: item.type ?? "CONSULTATION" })),
      ];
    } catch (error) {
      if (isOptionalError(error)) return [];
      throw error;
    }
  },

  markNotificationRead(
    settings: AppSettings,
    session: Session,
    item: NotificationItem,
    service: "medication" | "consultation"
  ) {
    const path =
      service === "medication"
        ? `/api/medication-notifications/${item.id}/read`
        : `/api/consultation-notifications/${item.id}/read`;
    return request<NotificationItem>(settings, service, path, { method: "PATCH", session });
  },

  getPharmacies(
    settings: AppSettings,
    params: {
      southLat: number;
      northLat: number;
      westLng: number;
      eastLng: number;
      limit?: number;
    }
  ) {
    return request<Pharmacy[]>(settings, "medication", "/api/pharmacies", { params });
  },

  searchPharmaciesByMedicine(
    settings: AppSettings,
    params: {
      itemName: string;
      southLat: number;
      northLat: number;
      westLng: number;
      eastLng: number;
    }
  ) {
    return request<Pharmacy[]>(settings, "medication", "/api/pharmacies/search/medicine", {
      params,
    });
  },

  getPharmacyDetail(settings: AppSettings, hpid: string) {
    return request<Pharmacy>(settings, "medication", `/api/pharmacies/${hpid}`);
  },

  registerPharmacy(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<string>(settings, "medication", "/api/pharmacies", {
      method: "POST",
      session,
      data,
    });
  },

  updatePharmacy(
    settings: AppSettings,
    session: Session,
    hpid: string,
    data: Record<string, unknown>
  ) {
    return request<void>(settings, "medication", `/api/pharmacies/${hpid}`, {
      method: "PATCH",
      session,
      data,
    });
  },

  getMyPharmacyInventory(settings: AppSettings, session: Session) {
    return request<PharmacyInventory[]>(
      settings,
      "medication",
      "/api/pharmacist/inventory",
      { session }
    );
  },

  upsertPharmacyInventory(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<string>(settings, "medication", "/api/pharmacist/inventory", {
      method: "POST",
      session,
      data,
    });
  },

  deletePharmacyInventory(settings: AppSettings, session: Session, id: number) {
    return request<string>(settings, "medication", `/api/pharmacist/inventory/${id}`, {
      method: "DELETE",
      session,
    });
  },

  getAdminStats(settings: AppSettings, session: Session) {
    return request<AdminStats>(settings, "auth", "/api/admin/stats", { session });
  },

  getAdminUsers(settings: AppSettings, session: Session) {
    return request<AdminUser[]>(settings, "auth", "/api/admin/users", { session });
  },

  deleteAdminUser(settings: AppSettings, session: Session, userId: number) {
    return request<string>(settings, "auth", `/api/admin/users/${userId}`, {
      method: "DELETE",
      session,
    });
  },

  getPendingPharmacists(settings: AppSettings, session: Session) {
    return request<PendingPharmacist[]>(
      settings,
      "auth",
      "/api/admin/pharmacists/pending",
      { session }
    );
  },

  approvePharmacist(settings: AppSettings, session: Session, userId: number) {
    return request<string>(settings, "auth", `/api/admin/pharmacists/${userId}/approve`, {
      method: "POST",
      session,
    });
  },

  rejectPharmacist(settings: AppSettings, session: Session, userId: number) {
    return request<string>(settings, "auth", `/api/admin/pharmacists/${userId}/reject`, {
      method: "POST",
      session,
    });
  },

  getMedicineSyncStatus(settings: AppSettings, session: Session) {
    return request(settings, "medication", "/api/medicines/sync-status", { session });
  },

  syncMedicines(settings: AppSettings, session: Session) {
    return request(settings, "medication", "/api/medicines/sync", {
      method: "POST",
      session,
      timeout: 300000,
    });
  },

  smartPillHealth(settings: AppSettings) {
    return request<{ status?: string; message?: string }>(
      settings,
      "medication",
      "/api/smartpill/test/health"
    );
  },

  async isNotFound(error: unknown) {
    return error instanceof AxiosError && error.response?.status === 404;
  },
};
