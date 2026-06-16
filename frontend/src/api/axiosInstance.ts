import axios from "axios";
import { useUserStore } from "../store/useUserStore";

const LOCAL_API_URL_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;

function resolveApiBaseUrl(configuredUrl?: string) {
  const normalizedUrl = configuredUrl?.trim().replace(/\/$/, "") ?? "";

  if (
    import.meta.env.DEV &&
    LOCAL_API_URL_PATTERN.test(normalizedUrl)
  ) {
    return "";
  }

  return normalizedUrl;
}

export const AUTH_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_AUTH_API_URL,
);
export const MEDICATION_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_MEDICATION_API_URL,
);
export const CONSULTATION_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_CONSULTATION_API_URL,
);
export const AI_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_AI_API_URL,
);

const createInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
  });

  instance.interceptors.request.use((config) => {
    const accessToken = useUserStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  return instance;
};

export const authInstance = createInstance(AUTH_BASE_URL);
export const medicationInstance = createInstance(MEDICATION_BASE_URL);
export const consultationInstance = createInstance(CONSULTATION_BASE_URL);
export const aiInstance = createInstance(AI_BASE_URL);
export const publicMedicationInstance = axios.create({
  baseURL: MEDICATION_BASE_URL,
  timeout: 30000,
});
