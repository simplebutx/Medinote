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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: number;
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
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isSmoking: boolean;
  isDrinking: boolean;
}

export interface UserAdditionalInfoResponse {
  userId: number;
  status: UserStatus;
}

export interface PharmacistVerificationRequest {
  docNumber: string;
  licenseNumber: string;
  licenseImage: File;
}

export interface PharmacistVerificationResponse {
  userId: number;
  status: UserStatus;
}