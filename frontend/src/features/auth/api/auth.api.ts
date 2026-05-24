import { authInstance } from "../../../api/axiosInstance";
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  PharmacistVerificationRequest,
  PharmacistVerificationResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SendEmailVerificationCodeRequest,
  SendEmailVerificationCodeResponse,
  SignupRequest,
  SignupResponse,
  UserAdditionalInfoRequest,
  UserAdditionalInfoResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
} from "../types/auth.types";

export const signup = async (body: SignupRequest) => {
  const response = await authInstance.post<SignupResponse>(
    "/api/auth/signup",
    body
  );

  return response.data;
};

export const sendEmailVerificationCode = async (
  body: SendEmailVerificationCodeRequest
) => {
  const response =
    await authInstance.post<SendEmailVerificationCodeResponse>(
      "/api/auth/email/verification-code",
      body
    );

  return response.data;
};

export const verifyEmailCode = async (body: VerifyEmailCodeRequest) => {
  const response = await authInstance.post<VerifyEmailCodeResponse>(
    "/api/auth/email/verify",
    body
  );

  return response.data;
};

export const login = async (body: LoginRequest) => {
  const response = await authInstance.post<LoginResponse>(
    "/api/auth/login",
    body
  );

  return response.data;
};

export const refreshToken = async (body: RefreshTokenRequest) => {
  const response = await authInstance.post<RefreshTokenResponse>(
    "/api/auth/token/refresh",
    body
  );

  return response.data;
};

export const logout = async () => {
  const response = await authInstance.post<LogoutResponse>(
    "/api/auth/logout"
  );

  return response.data;
};

export const signupUserAdditionalInfo = async (
  body: UserAdditionalInfoRequest
) => {
  const response = await authInstance.post<UserAdditionalInfoResponse>(
    "/api/auth/user/profile",
    body
  );

  return response.data;
};

export const requestPharmacistVerification = async (
  body: PharmacistVerificationRequest
) => {
  const formData = new FormData();

  const request = {
    email: body.email,
    docNumber: body.docNumber,
    licenseNumber: body.licenseNumber,
  };

  formData.append(
    "data",
    new Blob([JSON.stringify(request)], {
      type: "application/json",
    })
  );

  formData.append("licenseImage", body.licenseImage);

  const response =
    await authInstance.post<PharmacistVerificationResponse>(
      "/api/auth/pharmacists/verification",
      formData
    );

  return response.data;
};