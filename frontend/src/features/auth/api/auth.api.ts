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
  SocialProfileUpdateRequest,
  UserAdditionalInfoRequest,
  UserAdditionalInfoResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
 SendSmsVerificationCodeRequest,
  SendSmsVerificationCodeResponse,
  VerifySmsCodeRequest,
  VerifySmsCodeResponse
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

export const sendSmsVerificationCode = async (
  body: SendSmsVerificationCodeRequest
) => {
  const response = await authInstance.post<SendSmsVerificationCodeResponse>(
    "/api/auth/sms/send",
    body
  );

  return response.data;
};

export const verifySmsCode = async (body: VerifySmsCodeRequest) => {
  const response = await authInstance.post<VerifySmsCodeResponse>(
    "/api/auth/sms/verify",
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
  body: UserAdditionalInfoRequest,
  accessToken?: string,
) => {
  const response = await authInstance.post<UserAdditionalInfoResponse>(
    "/api/auth/user/profile",
    body,
    accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  );

  return response.data;
};

export const requestPharmacistVerification = async (
  body: PharmacistVerificationRequest,
  accessToken?: string,
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
      formData,
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    );

  return response.data;
};

export const updateSocialProfile = async (
  body: SocialProfileUpdateRequest,
  accessToken: string,
) => {
  const response = await authInstance.patch<string>(
    "/api/auth/me",
    body,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
};
