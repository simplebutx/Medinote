import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button, Input } from "../../../components/ui";
import { useDebounce } from "../../../hooks/useDebounce";
import { useCautionSuggest } from "../../user/hooks/useCautionSuggest";
import { useDiseaseSuggest } from "../../user/hooks/useDiseaseSuggest";
import type {
  CautionReason,
  CautionRequest,
  CautionTargetType,
} from "../../user/types/caution.types";
import useUserAdditionalInfoSignup from "../hooks/useUserAdditionalInfoSignup";
import { createMyCaution } from "../../user/api/caution.api";

interface UserAdditionalInfoStepProps {
  email: string;
  onBack: () => void;
  onComplete: () => void;
}

interface DiseaseOption {
  code: string;
  name: string;
}

function normalizeDiseaseName(value: string) {
  return value.trim().replace(/^@/, "");
}

function getUniqueDiseaseNames(values: string[]) {
  const seen = new Set<string>();

  return values.reduce<string[]>((result, value) => {
    const diseaseName = normalizeDiseaseName(value);
    const comparisonKey = diseaseName.toLocaleLowerCase();

    if (!diseaseName || seen.has(comparisonKey)) {
      return result;
    }

    seen.add(comparisonKey);
    result.push(diseaseName);
    return result;
  }, []);
}

const reasonOptions: { label: string; value: CautionReason }[] = [
  { label: "알레르기", value: "ALLERGY" },
  { label: "부작용", value: "SIDE_EFFECT" },
  { label: "의사 권고", value: "DOCTOR_ADVICE" },
  { label: "약사 권고", value: "PHARMACIST_ADVICE" },
  { label: "개인 회피", value: "PERSONAL_AVOID" },
  { label: "기타", value: "OTHER" },
];

const reasonLabelMap: Record<CautionReason, string> = {
  ALLERGY: "알레르기",
  SIDE_EFFECT: "부작용",
  DOCTOR_ADVICE: "의사 권고",
  PHARMACIST_ADVICE: "약사 권고",
  PERSONAL_AVOID: "개인 회피",
  OTHER: "기타",
};

function getCautionSourceLabel(type: CautionTargetType) {
  return type === "MEDICINE" ? "약" : "성분";
}

function UserAdditionalInfoStep({
  email,
  onBack,
  onComplete,
}: UserAdditionalInfoStepProps) {
  const userAdditionalInfoMutation = useUserAdditionalInfoSignup();

  const [isPregnant, setIsPregnant] = useState(false);
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [isSmoking, setIsSmoking] = useState(false);
  const [isDrinking, setIsDrinking] = useState(false);

  const [diseaseKeyword, setDiseaseKeyword] = useState("");
  const [isDiseaseSearchOpen, setIsDiseaseSearchOpen] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<DiseaseOption[]>([]);

  const debouncedDiseaseKeyword = useDebounce(diseaseKeyword, 300);
  const diseaseSearchKeyword = debouncedDiseaseKeyword.trim();

  const {
    data: diseaseSuggestions = [],
    isLoading: isDiseaseSuggestLoading,
  } = useDiseaseSuggest(diseaseSearchKeyword);

  const filteredDiseases = useMemo<DiseaseOption[]>(() => {
    return diseaseSuggestions.map((diseaseName) => ({
      code: diseaseName,
      name: diseaseName,
    }));
  }, [diseaseSuggestions]);

  const handleChangeDiseaseKeyword = (value: string) => {
    setDiseaseKeyword(value);
    setIsDiseaseSearchOpen(value.trim().length >= 2);
  };

  const handleAddDisease = (rawDiseaseName: string) => {
    const diseaseName = normalizeDiseaseName(rawDiseaseName);

    if (!diseaseName) {
      return;
    }

    setSelectedDiseases((prev) => {
      const alreadySelected = prev.some(
        (item) =>
          item.name.toLocaleLowerCase() === diseaseName.toLocaleLowerCase()
      );

      if (alreadySelected) {
        return prev;
      }

      return [
        ...prev,
        {
          code: diseaseName,
          name: diseaseName,
        },
      ];
    });

    setDiseaseKeyword("");
    setIsDiseaseSearchOpen(false);
  };

  const handleSelectDisease = (disease: DiseaseOption) => {
    handleAddDisease(disease.name);
  };

  const handleRemoveDisease = (diseaseCode: string) => {
    setSelectedDiseases((prev) =>
      prev.filter((disease) => disease.code !== diseaseCode)
    );
  };

  // 알레르기/주의 성분 form state
  const [pendingCautions, setPendingCautions] = useState<
    (CautionRequest & { displayName: string })[]
  >([]);
  const [cautionSourceType, setCautionSourceType] =
    useState<CautionTargetType>("INGREDIENT");
  const [cautionKeyword, setCautionKeyword] = useState("");
  const [isCautionSearchOpen, setIsCautionSearchOpen] = useState(false);
  const [selectedCautionTarget, setSelectedCautionTarget] = useState<{
    name: string;
    type: CautionTargetType;
  } | null>(null);
  const [cautionReason, setCautionReason] = useState<CautionReason>("ALLERGY");
  const [cautionMemo, setCautionMemo] = useState("");

  const debouncedCautionKeyword = useDebounce(cautionKeyword, 300);

  const { data: cautionSuggestions = [], isLoading: isCautionSuggestLoading } =
    useCautionSuggest(debouncedCautionKeyword, cautionSourceType);

  const handleChangeCautionSourceType = (type: CautionTargetType) => {
    setCautionSourceType(type);
    setCautionKeyword("");
    setSelectedCautionTarget(null);
    setIsCautionSearchOpen(false);
  };

  const handleSelectCautionTarget = (target: { name: string; type: CautionTargetType }) => {
    setSelectedCautionTarget(target);
    setCautionKeyword(target.name);
    setIsCautionSearchOpen(false);
  };

  const handleAddCaution = () => {
    const targetName = selectedCautionTarget?.name || cautionKeyword.trim();
    if (!targetName) {
      toast.error("약 또는 성분을 입력해주세요.");
      return;
    }

    const isDuplicate = pendingCautions.some(
      (c) => c.displayName.toLowerCase() === targetName.toLowerCase()
    );
    if (isDuplicate) {
      toast.error("이미 추가된 항목입니다.");
      return;
    }

    const request: CautionRequest & { displayName: string } =
      cautionSourceType === "MEDICINE"
        ? {
            itemName: targetName,
            reason: cautionReason,
            cautionType: "MEDICINE",
            memo: cautionMemo || null,
            displayName: targetName,
          }
        : {
            ingredientName: targetName,
            reason: cautionReason,
            cautionType: "INGREDIENT",
            memo: cautionMemo || null,
            displayName: targetName,
          };

    setPendingCautions((prev) => [...prev, request]);
    setCautionKeyword("");
    setSelectedCautionTarget(null);
    setCautionMemo("");
    setIsCautionSearchOpen(false);
  };

  const handleRemoveCaution = (displayName: string) => {
    setPendingCautions((prev) =>
      prev.filter((c) => c.displayName !== displayName)
    );
  };

  const handleSubmit = () => {
    const diseaseNames = getUniqueDiseaseNames([
      ...selectedDiseases.map((disease) => disease.name),
      diseaseKeyword,
    ]);

    userAdditionalInfoMutation.mutate(
      {
        email,
        isPregnant,
        isBreastfeeding,
        isSmoking,
        isDrinking,
        diseaseNames,
      },
      {
        onSuccess: async () => {
          if (pendingCautions.length > 0) {
            await Promise.allSettled(
              pendingCautions.map(({ displayName: _d, ...req }) =>
                createMyCaution(req)
              )
            );
          }
          toast.success("추가 정보가 저장되었습니다.");
          onComplete();
        },
        onError: (error) => {
          console.error("추가 정보 저장 실패:", error);
          toast.error("추가 정보 저장에 실패했습니다.");
        },
      }
    );
  };

  const choiceSelectedClass =
    "border-blue-500 bg-blue-50 text-blue-700";
  const choiceDefaultClass =
    "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50";

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        Step 2. 일반 사용자 추가 정보
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        복약 안내와 상담 정확도를 높이기 위해 건강 정보를 입력합니다.
      </p>

      <div className="mt-6 space-y-6">
        {/* 건강 상태 */}
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">
            건강 상태
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsPregnant((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isPregnant ? choiceSelectedClass : choiceDefaultClass,
              ].join(" ")}
            >
              임산부
            </button>

            <button
              type="button"
              onClick={() => setIsBreastfeeding((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isBreastfeeding ? choiceSelectedClass : choiceDefaultClass,
              ].join(" ")}
            >
              모유수유 중
            </button>

            <button
              type="button"
              onClick={() => setIsSmoking((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isSmoking ? choiceSelectedClass : choiceDefaultClass,
              ].join(" ")}
            >
              흡연
            </button>

            <button
              type="button"
              onClick={() => setIsDrinking((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isDrinking ? choiceSelectedClass : choiceDefaultClass,
              ].join(" ")}
            >
              음주
            </button>
          </div>
        </div>

        {/* 기저질환 */}
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
                  onClick={() => handleRemoveDisease(disease.code)}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
                >
                  {disease.name} ×
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Input
              placeholder="기저질환을 검색하거나 직접 입력하세요. 예: 고혈압"
              value={diseaseKeyword}
              onChange={(event) =>
                handleChangeDiseaseKeyword(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  handleAddDisease(diseaseKeyword);
                }
              }}
            />

            {isDiseaseSearchOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                  기저질환 검색 결과
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {isDiseaseSuggestLoading && (
                    <div className="px-3 py-4 text-sm text-blue-700">
                      기저질환을 검색하고 있습니다.
                    </div>
                  )}

                  {!isDiseaseSuggestLoading &&
                    filteredDiseases.map((disease) => (
                      <button
                        key={disease.code}
                        type="button"
                        onClick={() => handleSelectDisease(disease)}
                        className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <p className="font-semibold text-slate-900">{disease.name}</p>
                      </button>
                    ))}

                  {!isDiseaseSuggestLoading && filteredDiseases.length === 0 && (
                    <div className="px-3 py-4 text-sm text-slate-500">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            검색 결과를 선택하거나 직접 입력한 뒤 Enter 또는 쉼표로 추가할
            수 있습니다.
          </p>
        </div>

        {/* 알레르기/주의 성분 */}
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">
            알레르기/주의 성분
          </p>
          <p className="mb-4 text-xs text-slate-400">
            복약 OCR, 약 검색, 약사 상담에서 위험 성분 여부를 자동으로 체크합니다.
          </p>

          {/* 등록된 항목 목록 */}
          {pendingCautions.length > 0 && (
            <div className="mb-4 space-y-2">
              {pendingCautions.map((item) => (
                <div
                  key={item.displayName}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {item.displayName}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {getCautionSourceLabel(item.cautionType)}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {reasonLabelMap[item.reason]}
                      </span>
                    </div>
                    {item.memo && (
                      <p className="mt-1 text-xs text-slate-400">{item.memo}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCaution(item.displayName)}
                    className="shrink-0 text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 등록 폼 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            {/* 등록 방식 선택 */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                등록 방식
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeCautionSourceType("INGREDIENT")}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                    cautionSourceType === "INGREDIENT"
                      ? choiceSelectedClass
                      : choiceDefaultClass,
                  ].join(" ")}
                >
                  성분으로 등록
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCautionSourceType("MEDICINE")}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                    cautionSourceType === "MEDICINE"
                      ? choiceSelectedClass
                      : choiceDefaultClass,
                  ].join(" ")}
                >
                  약으로 등록
                </button>
              </div>
            </div>

            {/* 검색 */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                {cautionSourceType === "MEDICINE" ? "약 검색" : "성분 검색"}
              </p>
              <div className="relative">
                <Input
                  placeholder={
                    cautionSourceType === "MEDICINE"
                      ? "예: 아스피린, 타이레놀"
                      : "예: NSAIDs, 아세트아미노펜"
                  }
                  value={cautionKeyword}
                  onChange={(event) => {
                    setCautionKeyword(event.target.value);
                    setSelectedCautionTarget(null);
                    setIsCautionSearchOpen(true);
                  }}
                  onFocus={() => setIsCautionSearchOpen(true)}
                />

                {cautionKeyword.trim().length > 0 &&
                  cautionKeyword.trim().length < 2 && (
                    <p className="mt-2 text-xs text-slate-500">
                      두 글자 이상 입력하면 검색됩니다.
                    </p>
                  )}

                {isCautionSearchOpen &&
                  cautionKeyword.trim().length >= 2 && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                        {getCautionSourceLabel(cautionSourceType)} 검색 결과
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {isCautionSuggestLoading && (
                          <div className="px-3 py-4 text-sm text-slate-500">
                            검색 중입니다.
                          </div>
                        )}
                        {!isCautionSuggestLoading &&
                          cautionSuggestions.map((target) => (
                            <button
                              key={`${target.type}-${target.name}`}
                              type="button"
                              onClick={() => handleSelectCautionTarget(target)}
                              className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                            >
                              <p className="font-semibold text-slate-900">
                                {target.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {target.type === "MEDICINE" ? "약" : "성분"}
                              </p>
                            </button>
                          ))}
                        {!isCautionSuggestLoading &&
                          cautionSuggestions.length === 0 && (
                            <div className="px-3 py-4 text-sm text-slate-500">
                              검색 결과가 없습니다.
                            </div>
                          )}
                      </div>
                    </div>
                  )}
              </div>

              {selectedCautionTarget && (
                <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                  선택됨:{" "}
                  <span className="font-semibold text-blue-700">
                    {selectedCautionTarget.name}
                  </span>
                </div>
              )}
            </div>

            {/* 사유 */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">사유</p>
              <select
                value={cautionReason}
                onChange={(event) =>
                  setCautionReason(event.target.value as CautionReason)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 메모 */}
            <div>
              <p className="mb-2 text-sm text-slate-700">메모</p>
              <Input
                placeholder="예: 복용 후 속쓰림이 심했음"
                value={cautionMemo}
                onChange={(event) => setCautionMemo(event.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full border border-slate-200"
              onClick={handleAddCaution}
            >
              + 추가
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            가입 후 마이페이지에서도 추가·수정·삭제할 수 있습니다.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
          입력한 건강 정보는 복약 일정, 약 검색, AI 챗봇, 약사 상담에서 참고
          정보로 활용됩니다.
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            이전
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={userAdditionalInfoMutation.isPending}
          >
            {userAdditionalInfoMutation.isPending ? "저장 중..." : "가입 완료"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserAdditionalInfoStep;
