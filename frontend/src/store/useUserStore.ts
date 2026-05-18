import { create } from "zustand";
import type { UserRole } from "../types/common.types";

interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  userId: number | null;

  setLogin: (params: {
    accessToken: string;
    refreshToken: string;
    role: UserRole;
    userId: number;
  }) => void;

  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  accessToken: null,
  refreshToken: null,
  role: null,
  userId: null,

  setLogin: ({ accessToken, refreshToken, role, userId }) =>
    set({
      accessToken,
      refreshToken,
      role,
      userId,
    }),

  logout: () =>
    set({
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
    }),
}));