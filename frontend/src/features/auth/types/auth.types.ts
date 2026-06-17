import type { UserRole } from "../../../types/common.types";

export type Gender = "MALE" | "FEMALE";
export type UserStatus = "PENDING" | "ACTIVE";

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  birthDate: string;
  gender: Gender;
  role: UserRole;
}

export interface SignupResponse {
  userId: number;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface SendEmailVerificationCodeRequest {
  email: string;
}

export interface SendEmailVerificationCodeResponse {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface VerifyEmailCodeResponse {
  message: string;
  verified: boolean;
}

export interface SendSmsVerificationCodeRequest {
  phoneNumber: string;
}

export interface SendSmsVerificationCodeResponse {
  message?: string;
}

export interface VerifySmsCodeRequest {
  phoneNumber: string;
  code: string;
}

export type VerifySmsCodeResponse = boolean;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordUpdateRequest {
  oldPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
  newPassword: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: number;
  status?: string | null;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  message: string;
}

export interface UserAdditionalInfoRequest {
  email: string;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isSmoking: boolean;
  isDrinking: boolean;
  isChild?: boolean;
  isElderly?: boolean;
  diseaseNames: string[];
  cautions?: {
    itemSeq?: number | null;
    itemName?: string | null;
    ingredientCode?: string | null;
    ingredientName?: string | null;
    reason: string;
    cautionType: string;
    memo?: string | null;
  }[];
}

export interface UserAdditionalInfoResponse {
  userId: number;
  status: UserStatus;
}

export interface PharmacistVerificationRequest {
  email: string;
  docNumber: string;
  licenseNumber: string;
  licenseImage: File;
}

export interface PharmacistVerificationResponse {
  userId: number;
  status: UserStatus;
}

export interface SocialProfileUpdateRequest {
  username: string;
  birthDate: string;
  gender: Gender;
  role: Exclude<UserRole, "ADMIN">;
}
