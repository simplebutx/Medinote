import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { Badge, Button, Card, Input } from "../../components/ui";
import {
  requestPharmacistVerification,
  signupUserAdditionalInfo,
  updateSocialProfile,
} from "../../features/auth/api/auth.api";
import type { Gender } from "../../features/auth/types/auth.types";
import { useDiseaseSuggest } from "../../features/user/hooks/useDiseaseSuggest";
import { useDebounce } from "../../hooks/useDebounce";

type SocialSignupRole = "USER" | "PHARMACIST";

interface DiseaseOption {
  code: string;
  name: string;
}

const HEALTH_OPTIONS = [
  { key: "isPregnant", label: "임산부" },
  { key: "isBreastfeeding", label: "모유수유 중" },
  { key: "isSmoking", label: "흡연" },
  { key: "isDrinking", label: "음주" },
  { key: "isChild", label: "소아 (12세 미만)" },
  { key: "isElderly", label: "고령 (65세 이상)" },
] as const;

function SocialExtraInfoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [role, setRole] = useState<SocialSignupRole>("USER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [healthState, setHealthState] = useState({
    isPregnant: false,
    isBreastfeeding: false,
    isSmoking: false,
    isDrinking: false,
    isChild: false,
    isElderly: false,
  });
  const [diseaseKeyword, setDiseaseKeyword] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState<DiseaseOption[]>([]);

  const [docNumber, setDocNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<File | null>(null);

  const debouncedDiseaseKeyword = useDebounce(diseaseKeyword, 300);
  const { data: diseaseSuggestions = [], isLoading: isDiseaseLoading } =
    useDiseaseSuggest(debouncedDiseaseKeyword.trim());

  const filteredDiseases = useMemo(
    () =>
      diseaseSuggestions
        .filter(
          (name) =>
            !selectedDiseases.some((selected) => selected.name === name),
        )
        .map((name) => ({ code: name, name })),
    [diseaseSuggestions, selectedDiseases],
  );

  const hasValidSocialParams = Boolean(token && email);

  const handleNextStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!birthDate) {
      toast.error("생년월일을 입력해주세요.");
      return;
    }

    setStep(2);
  };

  const updateBasicProfile = () =>
    updateSocialProfile(
      {
        username: email.split("@")[0] || "사용자",
        birthDate,
        gender,
        role,
      },
      token,
    );

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await updateBasicProfile();
      await signupUserAdditionalInfo(
        {
          email,
          ...healthState,
          diseaseNames: selectedDiseases.map((disease) => disease.name),
        },
        token,
      );

      toast.success("소셜 회원가입이 완료되었습니다. 다시 로그인해주세요.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("소셜 사용자 추가 정보 저장 실패:", error);
      toast.error("추가 정보 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePharmacistSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!licenseImage) {
      toast.error("면허증 이미지를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateBasicProfile();
      await requestPharmacistVerification(
        {
          email,
          docNumber: docNumber.trim(),
          licenseNumber: licenseNumber.trim(),
          licenseImage,
        },
        token,
      );

      toast.success("약사 인증 요청이 완료되었습니다.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("소셜 약사 인증 요청 실패:", error);
      toast.error("약사 인증 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasValidSocialParams) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900">
          유효하지 않은 접근입니다
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          소셜 로그인을 처음부터 다시 진행해주세요.
        </p>
        <Button
          type="button"
          className="mt-6 w-full"
          onClick={() => navigate("/login", { replace: true })}
        >
          로그인으로 돌아가기
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <Badge variant="blue">소셜 회원가입</Badge>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">
        추가 정보 입력
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {email} 계정의 가입 정보를 완성해주세요. Step {step} / 2
      </p>

      {step === 1 && (
        <form className="mt-8 space-y-5" onSubmit={handleNextStep}>
          <Input
            label="생년월일"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            required
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">성별</p>
            <div className="grid grid-cols-2 gap-3">
              {(["MALE", "FEMALE"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold",
                    gender === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  {value === "MALE" ? "남성" : "여성"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              가입 유형
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["USER", "PHARMACIST"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={[
                    "rounded-xl border px-4 py-4 text-sm font-semibold",
                    role === value
                      ? value === "USER"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  {value === "USER" ? "일반 사용자" : "약사"}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            다음 단계
          </Button>
        </form>
      )}

      {step === 2 && role === "USER" && (
        <form className="mt-8 space-y-6" onSubmit={handleUserSubmit}>
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">
              건강 상태
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {HEALTH_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setHealthState((previous) => ({
                      ...previous,
                      [option.key]: !previous[option.key],
                    }))
                  }
                  className={[
                    "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                    healthState[option.key]
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">
              기저질환
            </p>
            {selectedDiseases.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedDiseases.map((disease) => (
                  <button
                    key={disease.code}
                    type="button"
                    onClick={() =>
                      setSelectedDiseases((previous) =>
                        previous.filter((item) => item.code !== disease.code),
                      )
                    }
                    className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
                  >
                    {disease.name} ×
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                placeholder="기저질환명을 2자 이상 입력하세요."
                value={diseaseKeyword}
                onChange={(event) => setDiseaseKeyword(event.target.value)}
              />
              {diseaseKeyword.trim().length >= 2 && (
                <div className="absolute left-0 top-full z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {isDiseaseLoading && (
                    <p className="px-3 py-3 text-sm text-slate-500">
                      검색 중입니다.
                    </p>
                  )}
                  {!isDiseaseLoading &&
                    filteredDiseases.map((disease) => (
                      <button
                        key={disease.code}
                        type="button"
                        onClick={() => {
                          setSelectedDiseases((previous) => [
                            ...previous,
                            disease,
                          ]);
                          setDiseaseKeyword("");
                        }}
                        className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-slate-50"
                      >
                        {disease.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
            >
              이전
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "가입 완료"}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && role === "PHARMACIST" && (
        <form className="mt-8 space-y-5" onSubmit={handlePharmacistSubmit}>
          <Input
            label="소속 약국명"
            value={docNumber}
            onChange={(event) => setDocNumber(event.target.value)}
            required
          />
          <Input
            label="면허번호"
            value={licenseNumber}
            onChange={(event) => setLicenseNumber(event.target.value)}
            required
          />
          <Input
            label="면허증 이미지"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setLicenseImage(event.target.files?.[0] ?? null)
            }
            required
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
            >
              이전
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "요청 중..." : "인증 요청"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default SocialExtraInfoPage;
