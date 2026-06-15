import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button, Input } from "../../../components/ui";
import { useDebounce } from "../../../hooks/useDebounce";
import { useDiseaseSuggest } from "../../user/hooks/useDiseaseSuggest";
import useUserAdditionalInfoSignup from "../hooks/useUserAdditionalInfoSignup";

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
        onSuccess: () => {
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

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        Step 2. 일반 사용자 추가 정보
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        복약 안내와 상담 정확도를 높이기 위해 건강 정보를 입력합니다.
      </p>

      <div className="mt-6 space-y-6">
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
                isPregnant
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600",
              ].join(" ")}
            >
              임산부
            </button>

            <button
              type="button"
              onClick={() => setIsBreastfeeding((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isBreastfeeding
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600",
              ].join(" ")}
            >
              모유수유 중
            </button>

            <button
              type="button"
              onClick={() => setIsSmoking((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isSmoking
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600",
              ].join(" ")}
            >
              흡연
            </button>

            <button
              type="button"
              onClick={() => setIsDrinking((prev) => !prev)}
              className={[
                "rounded-xl border px-4 py-4 text-left text-sm font-semibold",
                isDrinking
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600",
              ].join(" ")}
            >
              음주
            </button>
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

        <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
          입력한 건강 정보는 복약 일정, 약 검색, AI 챗봇, 약사 상담에서 참고
          정보로 활용됩니다. 알레르기/주의 성분은 가입 후 마이페이지에서
          별도로 등록하고 관리합니다.
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
