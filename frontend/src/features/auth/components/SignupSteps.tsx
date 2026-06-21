import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useSendSmsVerificationCode,
  useSignup,
  useVerifySmsCode,
} from "../hooks";

import UserAdditionalInfoStep from "./UserAdditionalInfoStep";
import PharmacistAdditionalInfoStep from "./PharmacistAdditionalInfoStep";

import { useState } from "react";
import { Button, Card, Input, Badge } from "../../../components/ui";
import type { UserRole } from "../../../types/common.types";

type Gender = "MALE" | "FEMALE";

function getEmailValidationMessage(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "이메일을 입력해주세요.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    return "이메일 형식이 올바르지 않습니다.";
  }

  return "";
}

function getPasswordValidationMessage(value: string) {
  if (!value) {
    return "비밀번호를 입력해주세요.";
  }

  const hasAlphabet = /[A-Za-z]/.test(value);
  const hasSpecialCharacter = /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(value);
  const hasValidLength = value.length >= 8 && value.length <= 20;
  const hasNoWhitespace = !/\s/.test(value);

  if (!hasValidLength || !hasAlphabet || !hasSpecialCharacter || !hasNoWhitespace) {
    return "비밀번호는 8자 이상 20자 이하이며 영문과 특수문자를 포함해야 합니다.";
  }

  return "";
}

function SignupSteps() {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [role, setRole] = useState<UserRole>("USER");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [hasTriedNextStep, setHasTriedNextStep] = useState(false);

  const navigate = useNavigate();

  const signupMutation = useSignup();
  const sendCodeMutation = useSendSmsVerificationCode();
  const verifyCodeMutation = useVerifySmsCode();

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToSensitive, setAgreedToSensitive] = useState(false);
  const emailValidationMessage = getEmailValidationMessage(email);
  const passwordValidationMessage = getPasswordValidationMessage(password);
  const shouldShowEmailError =
    (hasTriedNextStep || email.length > 0) && Boolean(emailValidationMessage);
  const shouldShowPasswordError =
    (hasTriedNextStep || password.length > 0) && Boolean(passwordValidationMessage);

  const handleCompleteSignup = () => {
    toast.success("회원가입이 완료되었습니다. 로그인해주세요.");
    navigate("/login", { replace: true });
  };


  const handleSendVerificationCode = () => {
    if (!phoneNumber.trim()) {
      toast.error("휴대폰 번호를 입력해주세요.");
      return;
    }

    sendCodeMutation.mutate(
      { phoneNumber: phoneNumber.trim() },
      {
        onSuccess: () => {
          toast.success("인증번호를 발송했습니다.");
        },
        onError: (error) => {
          console.error("휴대폰 인증번호 발송 실패:", error);
          toast.error("인증번호 발송에 실패했습니다. 콘솔과 네트워크 탭을 확인해주세요.");
        },
      }
    );
  };

  const handleVerifySmsCode = () => {
    if (!phoneNumber.trim() || !verificationCode.trim()) {
      toast.error("휴대폰 번호와 인증번호를 입력해주세요.");
      return;
    }

    verifyCodeMutation.mutate(
      {
        phoneNumber: phoneNumber.trim(),
        code: verificationCode.trim(),
      },
      {
        onSuccess: (verified) => {
          if (verified) {
            setIsPhoneVerified(true);
            toast.success("휴대폰 인증이 완료되었습니다.");
            return;
          }

          toast.error("인증번호가 올바르지 않습니다.");
        },
        onError: (error) => {
          console.error("휴대폰 인증 확인 실패:", error);
          toast.error("휴대폰 인증 확인에 실패했습니다.");
        },
      }
    );
  };

  const handleNextStep = () => {
    setHasTriedNextStep(true);

    if (emailValidationMessage || passwordValidationMessage) {
      toast.error("이메일과 비밀번호 형식을 확인해주세요.");
      return;
    }

    if (!username.trim() || !birthDate) {
      toast.error("필수 정보를 모두 입력해주세요.");
      return;
    }

    if (!isPhoneVerified) {
      toast.error("휴대폰 인증을 먼저 완료해주세요.");
      return;
    }

    if (!agreedToPrivacy || !agreedToSensitive) {
      toast.error("필수 약관에 모두 동의해주세요.");
      return;
    }

    signupMutation.mutate(
      {
        email: email.trim(),
        password,
        username: username.trim(),
        birthDate,
        gender,
        role,
      },
      {
        onSuccess: () => {
          toast.success("기본 정보가 저장되었습니다.");
          setStep(2);
        },
        onError: (error) => {
          console.error("회원가입 기본 정보 저장 실패:", error);
          toast.error("회원가입 기본 정보 저장에 실패했습니다. 콘솔과 네트워크 탭을 확인해주세요.");
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <div className="mb-8">
        <Badge variant="blue">회원가입</Badge>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          AI 복약 도우미 회원가입
        </h1>

        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                step >= 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              1
            </span>
            <span className={`text-sm font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              기본 정보
            </span>
          </div>

          <div className="h-px w-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                step >= 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              2
            </span>
            <span className={`text-sm font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              추가 정보
            </span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div>
          <div className="mt-6 space-y-4">
            <Input
              label="이메일"
              placeholder="example@email.com"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              errorMessage={shouldShowEmailError ? emailValidationMessage : undefined}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              errorMessage={
                shouldShowPasswordError ? passwordValidationMessage : undefined
              }
            />

            <Input
              label="이름"
              placeholder="홍길동"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />

            <Input
              label="생년월일"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                성별
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("MALE")}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold",
                    gender === "MALE"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  남성
                </button>

                <button
                  type="button"
                  onClick={() => setGender("FEMALE")}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold",
                    gender === "FEMALE"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  여성
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                가입 유형
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("USER")}
                  className={[
                    "rounded-xl border px-4 py-4 text-sm font-semibold",
                    role === "USER"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  일반 사용자
                </button>

                <button
                  type="button"
                  onClick={() => setRole("PHARMACIST")}
                  className={[
                    "rounded-xl border px-4 py-4 text-sm font-semibold",
                    role === "PHARMACIST"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  약사
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                휴대폰 인증
              </p>

              <div className="mb-3 flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="01012345678"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value);
                      setIsPhoneVerified(false);
                    }}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={handleSendVerificationCode}
                  disabled={sendCodeMutation.isPending}
                >
                  {sendCodeMutation.isPending ? "발송 중..." : "인증번호 발송"}
                </Button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="인증번호 입력"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleVerifySmsCode}
                  disabled={verifyCodeMutation.isPending}
                >
                  {verifyCodeMutation.isPending ? "확인 중..." : "인증 확인"}
                </Button>
              </div>

              {isPhoneVerified && (
                <p className="mt-2 text-sm font-medium text-emerald-600">
                  휴대폰 인증이 완료되었습니다.
                </p>
              )}
            </div>

            {/* ── 약관 동의 ── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                서비스 이용 약관
              </p>

              {/* 개인정보 수집 및 이용 동의 */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    필수
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    개인정보 수집 및 이용 동의
                  </p>
                </div>

                <div className="max-h-36 overflow-y-auto px-4 py-3 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-700">1. 수집·이용 목적</p>
                  <p className="mt-1">사용자 식별, 회원가입, 복약 일정 관리 및 알림 서비스 제공, AI 의약품 정보 챗봇 상담 서비스 제공</p>
                  <p className="mt-3 font-semibold text-slate-700">2. 수집하는 개인정보 항목</p>
                  <p className="mt-1">아이디, 비밀번호, 이메일</p>
                  <p className="mt-3 font-semibold text-slate-700">3. 개인정보의 보유 및 이용 기간</p>
                  <p className="mt-1">회원 탈퇴 시까지</p>
                  <p className="mt-3 font-semibold text-slate-700">4. 동의 거부 권리 및 불이익 안내</p>
                  <p className="mt-1">귀하는 본 개인정보 수집 및 이용 동의를 거부할 권리가 있습니다. 단, 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다.</p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    개인정보 수집 및 이용에 동의합니다.
                  </span>
                </label>
              </div>

              {/* 민감정보 수집 및 이용 동의 */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    필수
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    민감정보 수집 및 이용 동의
                  </p>
                </div>

                <div className="max-h-36 overflow-y-auto px-4 py-3 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-700">1. 수집·이용 목적</p>
                  <p className="mt-1">처방전 OCR 기반 복약 일정 자동 등록, 개인별 맞춤형 약물 정보 확인, 알레르기/부작용 예방 안내 및 맞춤형 헬스케어 솔루션 제공</p>
                  <p className="mt-3 font-semibold text-slate-700">2. 수집하는 민감정보 항목</p>
                  <p className="mt-1">처방전 사진 및 텍스트 데이터, 약물 복용 기록, 개인별 알레르기 성분 정보</p>
                  <p className="mt-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-500">
                    ※ 본 서비스는 개인정보 보호법 제23조에 의거하여 건강 관련 민감정보를 수집합니다.
                  </p>
                  <p className="mt-3 font-semibold text-slate-700">3. 개인정보의 보유 및 이용 기간</p>
                  <p className="mt-1">회원 탈퇴 시까지</p>
                  <p className="mt-3 font-semibold text-slate-700">4. 동의 거부 권리 및 불이익 안내</p>
                  <p className="mt-1">귀하는 본 민감정보 수집 및 이용 동의를 거부할 권리가 있습니다. 단, 동의 거부 시 처방전 OCR 인식 및 알레르기 부작용 매칭 등 핵심 기능 이용이 제한될 수 있습니다.</p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={agreedToSensitive}
                    onChange={(e) => setAgreedToSensitive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    민감정보 수집 및 이용에 동의합니다.
                  </span>
                </label>
              </div>

              {hasTriedNextStep && (!agreedToPrivacy || !agreedToSensitive) && (
                <p className="text-sm font-medium text-red-600">
                  필수 약관에 모두 동의해주세요.
                </p>
              )}
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleNextStep}
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "처리 중..." : "Step 2로 이동"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && role === "USER" && (
        <UserAdditionalInfoStep
          email={email}
          onBack={() => setStep(1)}
          onComplete={handleCompleteSignup}
        />
      )}

      {step === 2 && role === "PHARMACIST" && (
        <PharmacistAdditionalInfoStep
          email={email}
          onBack={() => setStep(1)}
          onComplete={handleCompleteSignup}
        />
      )}
    </Card>
  );
}

export default SignupSteps;
