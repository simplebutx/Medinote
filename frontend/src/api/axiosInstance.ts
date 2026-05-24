import axios from "axios";
import { useUserStore } from "../store/useUserStore";

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || "http://localhost:8080";
const MEDICATION_BASE_URL = import.meta.env.VITE_MEDICATION_API_URL || "http://localhost:8081";
const CONSULTATION_BASE_URL = import.meta.env.VITE_CONSULTATION_API_URL || "http://localhost:8082";
const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

const createInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 5000,
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
