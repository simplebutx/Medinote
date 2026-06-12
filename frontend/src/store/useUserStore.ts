import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserRole } from "../types/common.types";

interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  userId: number | null;
  status: string | null;

  setLogin: (params: {
    accessToken: string;
    refreshToken: string;
    role: UserRole;
    userId: number;
    status?: string | null;
  }) => void;

  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
      status: null,

      setLogin: ({ accessToken, refreshToken, role, userId, status }) =>
        set({
          accessToken,
          refreshToken,
          role,
          userId,
          status: status ?? null,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          role: null,
          userId: null,
          status: null,
        }),
    }),
    {
      name: "medinote-user-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accessToken, refreshToken, role, userId, status }) => ({
        accessToken,
        refreshToken,
        role,
        userId,
        status,
      }),
    },
  ),
);
