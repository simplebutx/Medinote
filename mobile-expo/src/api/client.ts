import axios, { type Method } from "axios";

import type {
  AppSettings,
  CautionSuggestionResponse,
  LoginResponse,
  MedicineSearchResponse,
  MedicationIntakeLogRequest,
  MedicationIntakeLogResponse,
  Session,
  UserMedicationCautionRequest,
  UserMedicationCautionResponse,
  ChatbotMessageResponse,
  MedicationScheduleResponse,
  MedicationScheduleTimeResponse,
} from "../types";

type ServiceName = "auth" | "medication" | "consultation";

const servicePortMap: Record<ServiceName, number> = {
  auth: 8080,
  medication: 8081,
  consultation: 8082,
};

function baseUrl(settings: AppSettings, service: ServiceName) {
  return `http://${settings.apiHost}:${servicePortMap[service]}`;
}

async function request<T>(
  settings: AppSettings,
  service: ServiceName,
  path: string,
  options: {
    method?: Method;
    data?: unknown;
    params?: Record<string, string | number | boolean | null | undefined>;
    session?: Session | null;
  } = {}
) {
  const response = await axios.request<T>({
    baseURL: baseUrl(settings, service),
    url: path,
    method: options.method ?? "GET",
    data: options.data,
    params: options.params,
    timeout: 30000,
    headers: options.session?.accessToken
      ? {
          Authorization: `Bearer ${options.session.accessToken}`,
        }
      : undefined,
  });

  return response.data;
}

export const api = {
  login(settings: AppSettings, email: string, password: string) {
    return request<LoginResponse>(settings, "auth", "/api/auth/login", {
      method: "POST",
      data: { email, password },
    });
  },

  sendVerificationCode(settings: AppSettings, email: string) {
    return request<{ message?: string }>(settings, "auth", "/api/auth/email/verification-code", {
      method: "POST",
      data: { email, code: "" },
    });
  },

  verifyEmailCode(settings: AppSettings, email: string, code: string) {
    return request<{ message: string; verified: boolean }>(
      settings,
      "auth",
      "/api/auth/email/verify",
      {
        method: "POST",
        data: { email, code },
      }
    );
  },

  signupBasic(
    settings: AppSettings,
    payload: {
      email: string;
      password: string;
      username: string;
      birthDate: string;
      gender: "MALE" | "FEMALE";
      role: "USER";
    }
  ) {
    return request<string>(settings, "auth", "/api/auth/signup", {
      method: "POST",
      data: payload,
    });
  },

  suggestDiseases(settings: AppSettings, keyword: string) {
    return request<string[]>(settings, "auth", "/api/auth/diseases/suggest", {
      params: { keyword },
    });
  },

  submitUserProfile(
    settings: AppSettings,
    payload: {
      email: string;
      isPregnant: boolean;
      isBreastfeeding: boolean;
      isSmoking: boolean;
      isDrinking: boolean;
      diseaseNames: string[];
    }
  ) {
    return request<string>(settings, "auth", "/api/auth/user/profile", {
      method: "POST",
      data: payload,
    });
  },

  logout(settings: AppSettings, session: Session) {
    return request<{ message: string }>(settings, "auth", "/api/auth/logout", {
      method: "POST",
      session,
    });
  },

  suggestMedicines(settings: AppSettings, keyword: string) {
    return request<string[]>(settings, "medication", "/api/medicines/suggest", {
      method: "POST",
      params: { keyword },
    });
  },

  searchMedicines(settings: AppSettings, keyword: string) {
    return request<MedicineSearchResponse[]>(settings, "medication", "/api/medicines/search", {
      params: { keyword },
    });
  },

  suggestCautions(settings: AppSettings, session: Session, keyword: string, type: string) {
    return request<CautionSuggestionResponse[]>(
      settings,
      "medication",
      "/api/me/cautions/suggest",
      {
        method: "POST",
        params: { keyword, type },
        session,
      }
    );
  },

  getCautions(settings: AppSettings, session: Session) {
    return request<UserMedicationCautionResponse[]>(settings, "medication", "/api/me/cautions", {
      session,
    });
  },

  createCaution(settings: AppSettings, session: Session, payload: UserMedicationCautionRequest) {
    return request<UserMedicationCautionResponse>(settings, "medication", "/api/me/cautions", {
      method: "POST",
      session,
      data: payload,
    });
  },

  updateCaution(
    settings: AppSettings,
    session: Session,
    id: number,
    payload: UserMedicationCautionRequest
  ) {
    return request<UserMedicationCautionResponse>(
      settings,
      "medication",
      `/api/me/cautions/${id}`,
      {
        method: "PATCH",
        session,
        data: payload,
      }
    );
  },

  deleteCaution(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/me/cautions/${id}`, {
      method: "DELETE",
      session,
    });
  },

  sendChatMessage(settings: AppSettings, session: Session | null, message: string) {
    return request<ChatbotMessageResponse>(settings, "consultation", "/api/chatbot/message", {
      method: "POST",
      session,
      data: { message },
    });
  },

  getSchedules(settings: AppSettings, session: Session) {
    return request<MedicationScheduleResponse[]>(settings, "medication", "/api/medication-schedules", {
      session,
    });
  },

  createSchedule(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<MedicationScheduleResponse>(settings, "medication", "/api/medication-schedules", {
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
    return request<MedicationScheduleResponse>(
      settings,
      "medication",
      `/api/medication-schedules/${id}`,
      {
        method: "PUT",
        session,
        data,
      }
    );
  },

  deleteSchedule(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/medication-schedules/${id}`, {
      method: "DELETE",
      session,
    });
  },

  getScheduleTimes(settings: AppSettings, session: Session, medicationScheduleId: number) {
    return request<MedicationScheduleTimeResponse[]>(
      settings,
      "medication",
      "/api/medication-schedule-times",
      {
        session,
        params: { medicationScheduleId },
      }
    );
  },

  createScheduleTime(settings: AppSettings, session: Session, data: Record<string, unknown>) {
    return request<MedicationScheduleTimeResponse>(
      settings,
      "medication",
      "/api/medication-schedule-times",
      {
        method: "POST",
        session,
        data,
      }
    );
  },

  updateScheduleTime(
    settings: AppSettings,
    session: Session,
    id: number,
    data: Record<string, unknown>
  ) {
    return request<MedicationScheduleTimeResponse>(
      settings,
      "medication",
      `/api/medication-schedule-times/${id}`,
      {
        method: "PUT",
        session,
        data,
      }
    );
  },

  deleteScheduleTime(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/medication-schedule-times/${id}`, {
      method: "DELETE",
      session,
    });
  },

  getIntakeLogs(settings: AppSettings, session: Session, medicationScheduleId: number) {
    return request<MedicationIntakeLogResponse[]>(
      settings,
      "medication",
      "/api/medication-intake-logs",
      {
        session,
        params: { medicationScheduleId },
      }
    );
  },

  createIntakeLog(settings: AppSettings, session: Session, data: MedicationIntakeLogRequest) {
    return request<MedicationIntakeLogResponse>(
      settings,
      "medication",
      "/api/medication-intake-logs",
      {
        method: "POST",
        session,
        data,
      }
    );
  },

  deleteIntakeLog(settings: AppSettings, session: Session, id: number) {
    return request<void>(settings, "medication", `/api/medication-intake-logs/${id}`, {
      method: "DELETE",
      session,
    });
  },
};
