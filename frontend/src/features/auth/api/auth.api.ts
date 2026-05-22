import { authInstance } from "../../../api/axiosInstance";

import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  SendEmailVerificationCodeRequest,
  SendEmailVerificationCodeResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
  UserAdditionalInfoRequest,
  UserAdditionalInfoResponse,
  PharmacistVerificationRequest,
  PharmacistVerificationResponse,
} from "../types/auth.types";

export const signup = async (
  body: SignupRequest
): Promise<SignupResponse> => {
  const response = await authInstance.post<SignupResponse>(
    "/api/auth/signup",
    body
  );

  return response.data;
};

export const sendEmailVerificationCode = async (
  body: SendEmailVerificationCodeRequest
): Promise<SendEmailVerificationCodeResponse> => {
  const response =
    await authInstance.post<SendEmailVerificationCodeResponse>(
      "/api/auth/email/verification-code",
      body
    );

  return response.data;
};

export const verifyEmailCode = async (
  body: VerifyEmailCodeRequest
): Promise<VerifyEmailCodeResponse> => {
  const response = await authInstance.post<VerifyEmailCodeResponse>(
    "/api/auth/email/verify",
    body
  );

  return response.data;
};

export const login = async (
  body: LoginRequest
): Promise<LoginResponse> => {
  const response = await authInstance.post<LoginResponse>(
    "/api/auth/login",
    body
  );

  return response.data;
};

export const registerUserAdditionalInfo = async (
  body: UserAdditionalInfoRequest
): Promise<UserAdditionalInfoResponse> => {
  const response = await authInstance.post<UserAdditionalInfoResponse>(
    "/api/auth/user/profile",
    body
  );

  return response.data;
};

export const registerPharmacistVerification = async (
  body: PharmacistVerificationRequest
): Promise<PharmacistVerificationResponse> => {
  const formData = new FormData();

  formData.append("docNumber", body.docNumber);
  formData.append("licenseNumber", body.licenseNumber);
  formData.append("licenseImage", body.licenseImage);

  const response =
    await authInstance.post<PharmacistVerificationResponse>(
      "/api/auth/pharmacists/verification",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

  return response.data;
};