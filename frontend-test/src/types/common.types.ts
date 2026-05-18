export type UserRole = "USER" | "PHARMACIST" | "ADMIN";

export interface ApiResponse<T> {
  data: T;
  message?: string;
}