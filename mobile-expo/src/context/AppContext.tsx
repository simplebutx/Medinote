import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  AI_BASE_URL,
  AUTH_BASE_URL,
  CONSULTATION_BASE_URL,
  MEDICATION_BASE_URL,
} from "../constants";
import type { AppSettings, Session } from "../types";

interface AppContextValue {
  hydrated: boolean;
  session: Session | null;
  settings: AppSettings;
  saveSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
  updateSession: (patch: Partial<Session>) => Promise<void>;
}

const storageKey = "medinote.mobile.session";

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const settings = useMemo<AppSettings>(
    () => ({
      authBaseUrl: AUTH_BASE_URL,
      medicationBaseUrl: MEDICATION_BASE_URL,
      consultationBaseUrl: CONSULTATION_BASE_URL,
      aiBaseUrl: AI_BASE_URL,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (mounted && raw) {
          setSession(JSON.parse(raw) as Session);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      session,
      settings,
      async saveSession(nextSession) {
        setSession(nextSession);
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextSession));
      },
      async updateSession(patch) {
        if (!session) return;
        const nextSession = { ...session, ...patch };
        setSession(nextSession);
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextSession));
      },
      async clearSession() {
        setSession(null);
        await AsyncStorage.removeItem(storageKey);
      },
    }),
    [hydrated, session, settings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}
