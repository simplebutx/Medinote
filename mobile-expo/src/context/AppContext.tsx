import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { API_BASE_URL, DEFAULT_API_HOST, PRESIGNED_UPLOAD_URL_ENDPOINT } from "../constants";
import type { AppSettings, Session } from "../types";

interface AppContextValue {
  session: Session | null;
  settings: AppSettings;
  hydrated: boolean;
  saveSession: (nextSession: Session) => Promise<void>;
  clearSession: () => Promise<void>;
}

const sessionKey = "mobile-expo.session";

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const settings: AppSettings = {
    apiHost: DEFAULT_API_HOST,
    apiBaseUrl: API_BASE_URL || undefined,
    presignedUploadUrlEndpoint: PRESIGNED_UPLOAD_URL_ENDPOINT,
  };

  useEffect(() => {
    (async () => {
      try {
        const rawSession = await AsyncStorage.getItem(sessionKey);

        if (rawSession) {
          setSession(JSON.parse(rawSession));
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      settings,
      hydrated,
      async saveSession(nextSession) {
        setSession(nextSession);
        await AsyncStorage.setItem(sessionKey, JSON.stringify(nextSession));
      },
      async clearSession() {
        setSession(null);
        await AsyncStorage.removeItem(sessionKey);
      },
    }),
    [hydrated, session, settings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
