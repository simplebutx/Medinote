import axios from "axios";
import { useUserStore } from "../store/useUserStore";

const createInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      "Content-Type": "application/json",
    },
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

export const authInstance = createInstance("http://localhost:8080");
export const medicationInstance = createInstance("http://localhost:8081");
export const consultationInstance = createInstance("http://localhost:8082");
export const aiInstance = createInstance("http://localhost:8000");