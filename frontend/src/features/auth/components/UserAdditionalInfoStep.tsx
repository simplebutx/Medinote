import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button, Input } from "../../../components/ui";
import useUserAdditionalInfoSignup from "../hooks/useUserAdditionalInfoSignup";

interface UserAdditionalInfoStepProps {
  onBack: () => void;
  onComplete: () => void;
}

interface DiseaseOption {
  code: string;
  name: string;
}

const diseaseOptions: DiseaseOption[] = [
  { code: "I10", name: "고혈압" },
  { code: "E11", name: "당뇨병" },
  { code: "J45", name: "천식" },
  { code: "K29", name: "위염" },
  { code: "K21", name: "역류성 식도염" },
  { code: "N18", name: "만성 신장질환" },
  { code: "K76", name: "간 질환" },
  { code: "E78", name: "고지혈증" },
  { code: "I20", name: "협심증" },
  { code: "I50", name: "심부전" },
];

function UserAdditionalInfoStep({
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

  const filteredDiseases = useMemo(() => {
    const keyword = diseaseKeyword.trim().replace("@", "").toLowerCase();

    if (!keyword) {
      return diseaseOptions;
    }

    return diseaseOptions.filter((disease) =>
      disease.name.toLowerCase().includes(keyword)
    );
  }, [diseaseKeyword]);

  const handleChangeDiseaseKeyword = (value: string) => {
    setDiseaseKeyword(value);

    if (value.startsWith("@")) {
      setIsDiseaseSearchOpen(true);
      return;
    }

    setIsDiseaseSearchOpen(false);
  };

  const handleSelectDisease = (disease: DiseaseOption) => {
    setSelectedDiseases((prev) => {
      const alreadySelected = prev.some((item) => item.code === disease.code);

      if (alreadySelected) {
        return prev;
      }

      return [...prev, disease];
    });

    setDiseaseKeyword("");
    setIsDiseaseSearchOpen(false);
  };

  const handleRemoveDisease = (diseaseCode: string) => {
    setSelectedDiseases((prev) =>
      prev.filter((disease) => disease.code !== diseaseCode)
    );
  };

  const handleSubmit = () => {
    userAdditionalInfoMutation.mutate(
      {
        isPregnant,
        isBreastfeeding,
        isSmoking,
        isDrinking,
        chronicDiseases: selectedDiseases.map((disease) => disease.name),
      },
      {
        onSuccess: () => {
          toast.success("추가 정보가 저장되었습니다.");
          onComplete();
        },
        onError: () => {
          toast.error("현재 API 연결 전입니다. 개발용으로 가입 완료 처리합니다.");
          onComplete();
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
              placeholder="@고혈압 처럼 입력하면 질환을 검색할 수 있습니다."
              value={diseaseKeyword}
              onChange={(event) =>
                handleChangeDiseaseKeyword(event.target.value)
              }
            />

            {isDiseaseSearchOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                  기저질환 검색 결과
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {filteredDiseases.map((disease) => (
                    <button
                      key={disease.code}
                      type="button"
                      onClick={() => handleSelectDisease(disease)}
                      className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <p className="font-semibold text-slate-900">
                        {disease.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        코드: {disease.code}
                      </p>
                    </button>
                  ))}

                  {filteredDiseases.length === 0 && (
                    <div className="px-3 py-4 text-sm text-slate-500">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            현재는 Mock Data 기준이며, 추후 질병 목록 API가 확정되면 DB 검색으로
            교체합니다.
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