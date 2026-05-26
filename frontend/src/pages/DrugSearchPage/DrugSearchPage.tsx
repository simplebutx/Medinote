import { useMemo, useState } from "react";

import { Badge, Button, Card, Input } from "../../components/ui";
import { useMedicineSearch, useMedicineSuggest } from "../../features/drug/hooks";
import type { MedicineSearchItem } from "../../features/drug/types/drug.types";

function getMedicineId(medicine: MedicineSearchItem) {
  return medicine.itemSeq ?? medicine.item_seq ?? 0;
}

function getMedicineName(medicine: MedicineSearchItem) {
  return medicine.itemName ?? medicine.item_name ?? "약 이름 정보 없음";
}

function getCompanyName(medicine: MedicineSearchItem) {
  return medicine.companyName ?? medicine.company_name ?? "제조사 정보 없음";
}

function getUseMethod(medicine: MedicineSearchItem) {
  return medicine.useMethod ?? medicine.use_method ?? "복용법 정보가 없습니다.";
}

function getWarningBeforeUse(medicine: MedicineSearchItem) {
  return (
    medicine.warningBeforeUse ??
    medicine.warning_before_use ??
    "사용 전 경고사항 정보가 없습니다."
  );
}

function getSideEffect(medicine: MedicineSearchItem) {
  return medicine.sideEffect ?? medicine.side_effect ?? "부작용 정보가 없습니다.";
}

function getStorageMethod(medicine: MedicineSearchItem) {
  return (
    medicine.storageMethod ??
    medicine.storage_method ??
    "보관법 정보가 없습니다."
  );
}

function getImageUrl(medicine: MedicineSearchItem) {
  return medicine.imageUrl ?? medicine.image_url ?? "";
}

function getUpdateDate(medicine: MedicineSearchItem) {
  return medicine.updateDe ?? medicine.update_de ?? "";
}

function getSafetyInfo(medicine: MedicineSearchItem) {
  const text = [
    getMedicineName(medicine),
    medicine.efficacy,
    medicine.caution,
    medicine.interaction,
    getSideEffect(medicine),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("아스피린") ||
    text.includes("aspirin") ||
    text.includes("nsaids") ||
    text.includes("이부프로펜")
  ) {
    return {
      badge: "red" as const,
      label: "주의 필요",
      message: "내 주의 성분 또는 위장 부작용 이력과 관련될 수 있습니다.",
    };
  }

  return {
    badge: "green" as const,
    label: "일반",
    message: "",
  };
}

function getEasySummary(medicine: MedicineSearchItem) {
  const name = getMedicineName(medicine);

  if (medicine.efficacy) {
    return `${name}은(는) ${medicine.efficacy} 정확한 복용법과 주의사항은 아래 상세 정보를 확인해주세요.`;
  }

  return `${name}의 상세 정보를 확인하고, 복용 중인 약이나 주의 성분이 있다면 약사 상담을 함께 이용해주세요.`;
}

function DrugSearchPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(
    null
  );

  const searchKeyword = keyword.trim();

  const {
    data: medicineResults = [],
    isLoading: isMedicineSearchLoading,
    isError: isMedicineSearchError,
  } = useMedicineSearch(searchKeyword);

  const { data: suggestions = [] } = useMedicineSuggest(searchKeyword);

  const selectedMedicine = useMemo(() => {
    if (medicineResults.length === 0) {
      return null;
    }

    if (selectedMedicineId === null) {
      return medicineResults[0];
    }

    return (
      medicineResults.find(
        (medicine) => getMedicineId(medicine) === selectedMedicineId
      ) ?? medicineResults[0]
    );
  }, [medicineResults, selectedMedicineId]);

  const popularKeywords = ["타이레놀", "아스피린", "이부프로펜", "활명수"];

  const handleAddSchedule = (drugName: string) => {
    alert(`${drugName} 복약 일정 추가 기능은 추후 API 연동 시 저장 처리합니다.`);
  };

  const handleAskPharmacist = (drugName: string) => {
    alert(`${drugName} 관련 약사 상담 연결은 추후 상담 API 연동 시 처리합니다.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Drug Search</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">약 검색</h1>

        <p className="mt-2 text-slate-500">
          약 이름, 성분, 제조사로 검색하고 복용법과 주의사항을 쉽게 확인합니다.
        </p>
      </div>

      <Card>
        <Input
          label="약 검색"
          placeholder="예: 타이레놀, 아스피린, 이부프로펜"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setSelectedMedicineId(null);
          }}
        />

        {suggestions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setKeyword(suggestion);
                  setSelectedMedicineId(null);
                }}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {popularKeywords.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setKeyword(item);
                  setSelectedMedicineId(null);
                }}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              >
                #{item}
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">검색 결과</h2>
            <Badge variant="blue">{medicineResults.length}건</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {!searchKeyword && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                약 이름이나 성분명을 입력해주세요.
              </div>
            )}

            {searchKeyword && isMedicineSearchLoading && (
              <div className="rounded-2xl bg-blue-50 p-6 text-center text-sm text-blue-700">
                약 정보를 검색하고 있습니다.
              </div>
            )}

            {searchKeyword && isMedicineSearchError && (
              <div className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-700">
                약 검색 결과를 불러오지 못했습니다.
              </div>
            )}

            {searchKeyword &&
              !isMedicineSearchLoading &&
              !isMedicineSearchError &&
              medicineResults.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  검색 결과가 없습니다.
                </div>
              )}

            {searchKeyword &&
              !isMedicineSearchLoading &&
              !isMedicineSearchError &&
              medicineResults.map((medicine, index) => {
                const medicineId = getMedicineId(medicine) || index + 1;
                const medicineName = getMedicineName(medicine);
                const safetyInfo = getSafetyInfo(medicine);
                const isSelected =
                  selectedMedicine &&
                  getMedicineId(selectedMedicine) === getMedicineId(medicine);

                return (
                  <button
                    key={`${medicineId}-${medicineName}`}
                    type="button"
                    onClick={() => setSelectedMedicineId(getMedicineId(medicine))}
                    className={[
                      "w-full rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">
                        {medicineName}
                      </p>

                      <Badge variant={safetyInfo.badge}>
                        {safetyInfo.label}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {getCompanyName(medicine)}
                    </p>

                    {medicine.efficacy && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {medicine.efficacy}
                      </p>
                    )}

                    {safetyInfo.message && (
                      <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {safetyInfo.message}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </Card>

        <Card>
          {selectedMedicine ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {getMedicineName(selectedMedicine)}
                    </h2>

                    <Badge variant={getSafetyInfo(selectedMedicine).badge}>
                      {getSafetyInfo(selectedMedicine).label}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {getCompanyName(selectedMedicine)}
                  </p>

                  {getUpdateDate(selectedMedicine) && (
                    <p className="mt-1 text-xs text-slate-400">
                      공공데이터 수정일: {getUpdateDate(selectedMedicine)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handleAddSchedule(getMedicineName(selectedMedicine))
                    }
                  >
                    일정 추가
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={() =>
                      handleAskPharmacist(getMedicineName(selectedMedicine))
                    }
                  >
                    약사 문의
                  </Button>
                </div>
              </div>

              {getSafetyInfo(selectedMedicine).message && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium leading-6 text-red-700">
                  {getSafetyInfo(selectedMedicine).message}
                </div>
              )}

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-700">
                  AI 쉬운 설명
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-700">
                  {getEasySummary(selectedMedicine)}
                </p>

                <p className="mt-2 text-xs text-blue-500">
                  현재는 약 검색 API 응답 기반 요약이며, 추후 쉬운 설명 API와
                  연결할 수 있습니다.
                </p>
              </div>

              {getImageUrl(selectedMedicine) && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">약 이미지</p>

                  <img
                    src={getImageUrl(selectedMedicine)}
                    alt={getMedicineName(selectedMedicine)}
                    className="mt-3 max-h-48 rounded-xl object-contain"
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">제조사</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {getCompanyName(selectedMedicine)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">보관법</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {getStorageMethod(selectedMedicine)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    효능
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedMedicine.efficacy || "효능 정보가 없습니다."}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    복용법
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {getUseMethod(selectedMedicine)}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    사용 전 경고
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {getWarningBeforeUse(selectedMedicine)}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    주의사항
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedMedicine.caution || "주의사항 정보가 없습니다."}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    상호작용
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedMedicine.interaction || "상호작용 정보가 없습니다."}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    부작용
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {getSideEffect(selectedMedicine)}
                  </p>
                </details>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              왼쪽 검색 결과에서 약을 선택해주세요.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default DrugSearchPage;