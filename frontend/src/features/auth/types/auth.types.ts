import type { UserRole } from "../../../types/common.types";

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  role: UserRole;
}

export interface SignupResponse {
  userId: number;
  email: string;
  role: UserRole;
  status: "PENDING" | "ACTIVE";
}

export interface SendEmailVerificationCodeRequest {
  email: string;
}

export interface SendEmailVerificationCodeResponse {
  expiresInSeconds: number;
}

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface VerifyEmailCodeResponse {
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

export interface UserAdditionalInfoRequest {
  allergies: string[];
  diseases: string[];
}

export interface UserAdditionalInfoResponse {
  userId: number;
  status: "ACTIVE";
}

export interface PharmacistVerificationRequest {
  docNumber: string;
  licenseNumber: string;
  licenseImage: File;
}

export interface PharmacistVerificationResponse {
  userId: number;
  status: "ACTIVE";
}