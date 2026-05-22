import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useSendEmailVerificationCode,
  useSignup,
  useVerifyEmailCode,
} from "../hooks";

import UserAdditionalInfoStep from "./UserAdditionalInfoStep";
import PharmacistAdditionalInfoStep from "./PharmacistAdditionalInfoStep";

import { useState } from "react";
import { Button, Card, Input, Badge } from "../../../components/ui";
import type { UserRole } from "../../../types/common.types";
import { useUserStore } from "../../../store/useUserStore";

type Gender = "MALE" | "FEMALE";

function SignupSteps() {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [role, setRole] = useState<UserRole>("USER");
  const [verificationCode, setVerificationCode] = useState("");

  const navigate = useNavigate();
  const setLogin = useUserStore((state) => state.setLogin);

  const signupMutation = useSignup();
  const sendCodeMutation = useSendEmailVerificationCode();
  const verifyCodeMutation = useVerifyEmailCode();

  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const handleCompleteSignup = () => {
    setLogin({
      accessToken: "mock-signup-access-token",
      refreshToken: "mock-signup-refresh-token",
      role,
      userId: 1,
    });

    toast.success("회원가입이 완료되었습니다.");

    if (role === "USER") {
      navigate("/app/schedule");
      return;
    }

    navigate("/pharmacist/dashboard");
  };


  const handleSendVerificationCode = () => {
    if (!email) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    sendCodeMutation.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("인증번호를 발송했습니다.");
        },
        onError: () => {
          toast.error("현재 API 연결 전입니다. 화면 흐름은 계속 확인할 수 있어요.");
        },
      }
    );
  };

  const handleVerifyEmailCode = () => {
    if (!email || !verificationCode) {
      toast.error("이메일과 인증번호를 입력해주세요.");
      return;
    }

    verifyCodeMutation.mutate(
      {
        email,
        code: verificationCode,
      },
      {
        onSuccess: (data) => {
          if (data.verified) {
            setIsEmailVerified(true);
            toast.success("이메일 인증이 완료되었습니다.");
            return;
          }

          toast.error("인증번호가 올바르지 않습니다.");
        },
        onError: () => {
          setIsEmailVerified(true);
          toast.success("개발용 인증 완료 처리");
        },
      }
    );
  };
  const handleNextStep = () => {
    if (!email || !password || !username || !birthDate) {
      toast.error("필수 정보를 모두 입력해주세요.");
      return;
    }

    if (!isEmailVerified) {
      toast.error("이메일 인증을 먼저 완료해주세요.");
      return;
    }

    signupMutation.mutate(
      {
        email,
        password,
        username,
        birthDate,
        gender,
        role,
      },
      {
        onSuccess: () => {
          toast.success("기본 정보가 저장되었습니다.");
          setStep(2);
        },
        onError: () => {
          toast.error("현재 API 연결 전입니다. 개발용으로 다음 단계로 이동합니다.");
          setStep(2);
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <div className="mb-8">
        <Badge variant="blue">회원가입</Badge>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          AI 복약 도우미 회원가입
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Step {step} / 2
        </p>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 1. 공통 계정 정보 + 이메일 인증
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            계정 정보를 입력하고 이메일 인증을 완료합니다.
          </p>

          <div className="mt-6 space-y-4">
            <Input
              label="이메일"
              placeholder="example@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
                이메일 인증
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="인증번호 입력"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value)
                  }
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleVerifyEmailCode}
                  disabled={verifyCodeMutation.isPending}
                >
                  {verifyCodeMutation.isPending ? "확인 중..." : "인증 확인"}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="mt-3"
                onClick={handleSendVerificationCode}
                disabled={sendCodeMutation.isPending}
              >
                {sendCodeMutation.isPending ? "발송 중..." : "인증번호 발송"}
              </Button>

              {isEmailVerified && (
                <p className="mt-2 text-sm font-medium text-emerald-600">
                  이메일 인증이 완료되었습니다.
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
          onBack={() => setStep(1)}
          onComplete={handleCompleteSignup}
        />
      )}

      {step === 2 && role === "PHARMACIST" && (
        <PharmacistAdditionalInfoStep
          onBack={() => setStep(1)}
          onComplete={handleCompleteSignup}
        />
      )}
    </Card>
  );
}

export default SignupSteps;