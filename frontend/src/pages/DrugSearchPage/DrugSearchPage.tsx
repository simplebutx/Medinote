import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Badge, Card, Input } from "../../components/ui";
import { useMedicineSearch, useMedicineSuggest } from "../../features/drug/hooks";
import type { MedicineSearchItem } from "../../features/drug/types/drug.types";
import { useDebounce } from "../../hooks/useDebounce";


function getMedicineId(medicine: MedicineSearchItem) {
  return String(medicine.itemSeq ?? medicine.item_seq ?? '');
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

function getImageUrl(medicine: MedicineSearchItem) {
  return medicine.imageUrl ?? medicine.image_url ?? "";
}

function getUpdateDate(medicine: MedicineSearchItem) {
  return medicine.updateDe ?? medicine.update_de ?? "";
}

function getSafetyInfo(medicine: MedicineSearchItem) {
  return {
    hasWarningMedicine: Boolean(
      medicine.warningMedicine ?? medicine.warning_medicine,
    ),
    hasWarningIngredient: Boolean(
      medicine.warningIngredient ?? medicine.warning_ingredient,
    ),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") ?? "";

  const [keyword, setKeyword] = useState(initialKeyword);
  const [committedKeyword, setCommittedKeyword] = useState(initialKeyword);

  const handleChangeKeyword = (value: string) => {
    const nextKeyword = value.trimStart();

    setKeyword(nextKeyword);
    setCommittedKeyword('');
    setSelectedMedicineId(null);
  };

  const handleSelectKeyword = (value: string) => {
    const nextKeyword = value.trim();

    setKeyword(nextKeyword);
    setCommittedKeyword(nextKeyword);
    setSelectedMedicineId(null);

    if (nextKeyword) {
      setSearchParams({ keyword: nextKeyword }, { replace: true });
      return;
    }

    setSearchParams({}, { replace: true });
  };
  
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(
    null,
  );

  const debouncedKeyword = useDebounce(keyword, 300);
  const suggestKeyword = debouncedKeyword.trim();
  const searchKeyword = committedKeyword.trim();

  const isSuggestEnabled = suggestKeyword.length >= 2;
  const isSearchEnabled = searchKeyword.length >= 2;

  const {
    data: medicineResults = [],
    isLoading: isMedicineSearchLoading,
    isError: isMedicineSearchError,
  } = useMedicineSearch(isSearchEnabled ? searchKeyword : "");

  const {
    data: suggestions = [],
    isLoading: isMedicineSuggestLoading,
  } = useMedicineSuggest(isSuggestEnabled ? suggestKeyword : '');

  const shouldShowSearchDropdown = keyword.trim().length >= 2;

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

  // const popularKeywords = ["타이레놀", "아스피린", "이부프로펜", "활명수"];

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
            handleChangeKeyword(event.target.value);
            setSelectedMedicineId(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            const nextKeyword = keyword.trim();

            if (suggestions.length > 0) {
              handleSelectKeyword(suggestions[0]);
              return;
            }

            if (nextKeyword.length >= 2) {
              handleSelectKeyword(nextKeyword);
            }
          }}
        />

        {shouldShowSearchDropdown && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-4 pt-2 pb-1">
              <p className="text-xs font-semibold text-slate-500">약 검색 결과</p>
            </div>

            <div className="max-h-56 overflow-y-auto py-2">
              {isSuggestEnabled && !committedKeyword && isMedicineSuggestLoading && (
                <div className="px-4 py-4 text-sm text-blue-700">
                  약 검색 결과를 불러오는 중입니다.
                </div>
              )}

              {isSuggestEnabled &&
                !committedKeyword &&
                !isMedicineSuggestLoading &&
                suggestions.length === 0 && (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                )}

              {isSuggestEnabled &&
                !committedKeyword &&
                !isMedicineSuggestLoading &&
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectKeyword(suggestion)}
                    className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">{suggestion}</p>
                    <p className="mt-1 text-xs text-slate-500">약</p>
                  </button>
                ))}

              {isSearchEnabled && isMedicineSearchLoading && (
                <div className="px-4 py-4 text-sm text-blue-700">
                  약 정보를 검색하고 있습니다.
                </div>
              )}

              {isSearchEnabled && isMedicineSearchError && (
                <div className="px-4 py-4 text-sm text-red-700">
                  약 검색 결과를 불러오지 못했습니다.
                </div>
              )}

              {isSearchEnabled &&
                !isMedicineSearchLoading &&
                !isMedicineSearchError &&
                medicineResults.length === 0 && (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                )}

              {isSearchEnabled &&
                !isMedicineSearchLoading &&
                !isMedicineSearchError &&
                medicineResults.map((medicine, index) => {
                  const medicineId = getMedicineId(medicine) || String(index + 1);
                  const medicineName = getMedicineName(medicine);
                  const safetyInfo = getSafetyInfo(medicine);

                  const isSelected =
                    selectedMedicine !== null &&
                    getMedicineId(selectedMedicine) === getMedicineId(medicine);

                  return (
                    <button
                      key={`${medicineId}-${medicineName}`}
                      type="button"
                      onClick={() => setSelectedMedicineId(getMedicineId(medicine))}
                      className={[
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                        isSelected ? "bg-blue-50" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {medicineName}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {getCompanyName(medicine)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {safetyInfo.hasWarningMedicine && (
                          <Badge variant="red">주의 약 포함</Badge>
                        )}

                        {safetyInfo.hasWarningIngredient && (
                          <Badge variant="yellow">주의 성분 포함</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </Card>

      <Card>
        {selectedMedicine ? (
          <div className="space-y-5">
            <div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {getMedicineName(selectedMedicine)}
                  </h2>

                  {getSafetyInfo(selectedMedicine).hasWarningMedicine && (
                    <Badge variant="red">주의 약 포함</Badge>
                  )}

                  {getSafetyInfo(selectedMedicine).hasWarningIngredient && (
                    <Badge variant="yellow">주의 성분 포함</Badge>
                  )}
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
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm leading-6 text-blue-700">
                {getEasySummary(selectedMedicine)}
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
            검색 결과에서 약을 선택해주세요.
          </div>
        )}
      </Card>
    </div>
  );
}

export default DrugSearchPage;
