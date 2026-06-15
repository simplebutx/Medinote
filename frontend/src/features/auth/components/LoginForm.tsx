import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button, Input } from "../../../components/ui";
import type { UserRole } from "../../../types/common.types";
import useLogin from "../hooks/useLogin";
import { useResetPassword } from "../hooks";

type SocialProvider = "google" | "naver" | "kakao";

const AUTH_BASE_URL = (
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const SOCIAL_LOGIN_OPTIONS: Array<{
  provider: SocialProvider;
  label: string;
}> = [
  {
    provider: "google",
    label: "Google 계정으로 로그인",
  },
  {
    provider: "naver",
    label: "네이버 계정으로 로그인",
  },
  {
    provider: "kakao",
    label: "카카오 계정으로 로그인",
  },
];

function SocialLogo({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
      >
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
        />
      </svg>
    );
  }

  if (provider === "naver") {
    return (
      <span
        aria-hidden="true"
        className="flex size-5 items-center justify-center rounded-[4px] bg-[#03c75a] text-[12px] font-black leading-none text-white"
      >
        N
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-5 items-center justify-center rounded-full bg-[#fee500]"
    >
      <svg viewBox="0 0 24 24" className="size-4 fill-[#191919]">
        <path d="M12 3.5c-5.25 0-9.5 3.33-9.5 7.44 0 2.64 1.76 4.96 4.41 6.28l-1.12 4.1a.35.35 0 0 0 .53.38l4.82-3.2c.28.02.57.03.86.03 5.25 0 9.5-3.33 9.5-7.44S17.25 3.5 12 3.5Z" />
      </svg>
    </span>
  );
}

function getRedirectPath(role: UserRole) {
  if (role === "USER") return "/app/schedule";
  if (role === "PHARMACIST") return "/pharmacist/dashboard";
  return "/admin/dashboard";
}

function getEmailValidationMessage(value: string) {
  if (!value.trim()) {
    return "이메일을 입력해주세요.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "이메일 형식이 올바르지 않습니다.";
  }

  return "";
}

function getPasswordValidationMessage(value: string) {
  if (!value) {
    return "새 비밀번호를 입력해주세요.";
  }

  const hasAlphabet = /[A-Za-z]/.test(value);
  const hasSpecialCharacter =
    /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(value);
  const hasValidLength = value.length >= 8 && value.length <= 20;
  const hasNoWhitespace = !/\s/.test(value);

  if (
    !hasValidLength ||
    !hasAlphabet ||
    !hasSpecialCharacter ||
    !hasNoWhitespace
  ) {
    return "비밀번호는 8자 이상 20자 이하이며 영문과 특수문자를 포함해야 합니다.";
  }

  return "";
}

function LoginForm() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const resetPasswordMutation = useResetPassword();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [hasTriedPasswordReset, setHasTriedPasswordReset] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          toast.success("로그인이 완료되었습니다.");
          navigate(getRedirectPath(data.role));
        },
        onError: () => {
          toast.error("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
        },
      }
    );
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    window.location.assign(
      `${AUTH_BASE_URL}/oauth2/authorization/${provider}`,
    );
  };

  const handleOpenPasswordReset = () => {
    setResetEmail(email.trim());
    setNewPassword("");
    setNewPasswordConfirm("");
    setHasTriedPasswordReset(false);
    setIsPasswordResetOpen(true);
  };

  const handleClosePasswordReset = () => {
    if (resetPasswordMutation.isPending) {
      return;
    }

    setIsPasswordResetOpen(false);
    setResetEmail("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setHasTriedPasswordReset(false);
  };

  const handlePasswordReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasTriedPasswordReset(true);

    const emailValidationMessage = getEmailValidationMessage(resetEmail);
    const passwordValidationMessage =
      getPasswordValidationMessage(newPassword);

    if (emailValidationMessage) {
      toast.error(emailValidationMessage);
      return;
    }

    if (passwordValidationMessage) {
      toast.error(passwordValidationMessage);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    resetPasswordMutation.mutate(
      {
        email: resetEmail.trim(),
        newPassword,
      },
      {
        onSuccess: () => {
          toast.success("비밀번호가 재설정되었습니다.");
          setEmail(resetEmail.trim());
          setIsPasswordResetOpen(false);
          setResetEmail("");
          setNewPassword("");
          setNewPasswordConfirm("");
          setHasTriedPasswordReset(false);
        },
        onError: (error) => {
          console.error("비밀번호 재설정 실패:", error);
          toast.error("비밀번호 재설정에 실패했습니다. 이메일을 확인해주세요.");
        },
      },
    );
  };

  return (
    <>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="mb-3 text-sm font-bold text-blue-600">MEDINOTE</p>
      <h1 className="mb-2 text-3xl font-bold text-slate-900">로그인</h1>

      <p className="mb-6 text-sm text-slate-500">
        이메일과 비밀번호를 입력해 로그인하세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="이메일"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Input
          label="비밀번호"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleOpenPasswordReset}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400">간편 로그인</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-3">
        {SOCIAL_LOGIN_OPTIONS.map((option) => (
          <button
            key={option.provider}
            type="button"
            onClick={() => handleSocialLogin(option.provider)}
            className={[
              "relative flex h-12 w-full items-center justify-center rounded-xl border border-slate-200",
              "bg-white px-4 text-sm font-semibold text-slate-700 transition",
              "hover:border-slate-300 hover:bg-slate-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
            ].join(" ")}
          >
            <span className="absolute left-4 flex size-7 items-center justify-center">
              <SocialLogo provider={option.provider} />
            </span>
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <p className="mb-3 text-center text-sm text-slate-500">
          아직 계정이 없으신가요?
        </p>
        <Button
          type="button"
          variant="ghost"
          className="w-full border border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          onClick={() => navigate("/signup")}
        >
          회원가입
        </Button>
      </div>
      </div>

      {isPasswordResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-reset-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={handlePasswordReset}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="password-reset-title"
                  className="text-xl font-bold text-slate-900"
                >
                  비밀번호 재설정
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  가입한 이메일과 새 비밀번호를 입력해주세요.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClosePasswordReset}
                disabled={resetPasswordMutation.isPending}
                aria-label="비밀번호 재설정 창 닫기"
              >
                닫기
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <Input
                label="이메일"
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                errorMessage={
                  hasTriedPasswordReset || resetEmail.length > 0
                    ? getEmailValidationMessage(resetEmail)
                    : undefined
                }
                disabled={resetPasswordMutation.isPending}
              />

              <Input
                label="새 비밀번호"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                errorMessage={
                  hasTriedPasswordReset || newPassword.length > 0
                    ? getPasswordValidationMessage(newPassword)
                    : undefined
                }
                disabled={resetPasswordMutation.isPending}
              />

              <Input
                label="새 비밀번호 확인"
                type="password"
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(event) =>
                  setNewPasswordConfirm(event.target.value)
                }
                errorMessage={
                  (hasTriedPasswordReset ||
                    newPasswordConfirm.length > 0) &&
                  newPassword !== newPasswordConfirm
                    ? "새 비밀번호가 일치하지 않습니다."
                    : undefined
                }
                disabled={resetPasswordMutation.isPending}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="border border-slate-200"
                onClick={handleClosePasswordReset}
                disabled={resetPasswordMutation.isPending}
              >
                취소
              </Button>

              <Button
                type="submit"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending
                  ? "재설정 중..."
                  : "비밀번호 재설정"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default LoginForm;
