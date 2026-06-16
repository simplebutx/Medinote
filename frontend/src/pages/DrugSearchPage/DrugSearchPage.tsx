import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Badge, Card, Input } from "../../components/ui";
import { useMedicineSearch, useMedicineSuggest } from "../../features/drug/hooks";
import type {
  MedicineGeneralCautionTag,
  MedicineSearchItem,
} from "../../features/drug/types/drug.types";
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

function getGeneralCautionTags(medicine: MedicineSearchItem) {
  return (medicine.generalCautionTags ?? medicine.general_caution_tags ?? []).filter(
    Boolean,
  );
}

function getGeneralCautionTagName(tag: MedicineGeneralCautionTag) {
  return tag.tagName || tag.tag_name || "일반 주의";
}

function getGeneralCautionTagCode(tag: MedicineGeneralCautionTag) {
  return tag.tagCode ?? tag.tag_code ?? getGeneralCautionTagName(tag);
}

function getEasySummary(medicine: MedicineSearchItem) {
  const name = getMedicineName(medicine);

  if (medicine.efficacy) {
    return `${name}은(는) ${medicine.efficacy} 정확한 복용법과 주의사항은 아래 상세 정보를 확인해주세요.`;
  }

  return `${name}의 상세 정보를 확인하고, 복용 중인 약이나 주의 성분이 있다면 약사 상담을 함께 이용해주세요.`;
}

/* ────────── Chevron SVG ────────── */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ────────── Detail accordion section ────────── */
function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-slate-900">{title}</span>
        <ChevronIcon className="shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
        <p className="text-sm leading-6 text-slate-600">{content}</p>
      </div>
    </details>
  );
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
    if (medicineResults.length === 0) return null;
    if (selectedMedicineId === null) return medicineResults[0];
    return (
      medicineResults.find(
        (medicine) => getMedicineId(medicine) === selectedMedicineId
      ) ?? medicineResults[0]
    );
  }, [medicineResults, selectedMedicineId]);

  return (
    <div className="space-y-6">
      {/* ── Main layout: search left / detail right ── */}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr] lg:items-start">

        {/* ── LEFT: Search panel ── */}
        <div className="space-y-4">
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
                if (event.key !== "Enter") return;
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
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    검색 결과
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {/* ── Suggest loading ── */}
                  {isSuggestEnabled && !committedKeyword && isMedicineSuggestLoading && (
                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                      검색 중…
                    </div>
                  )}

                  {/* ── Suggest empty ── */}
                  {isSuggestEnabled && !committedKeyword && !isMedicineSuggestLoading && suggestions.length === 0 && (
                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                      검색 결과가 없습니다.
                    </div>
                  )}

                  {/* ── Suggest list ── */}
                  {isSuggestEnabled && !committedKeyword && !isMedicineSuggestLoading &&
                    suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectKeyword(suggestion)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <span className="text-sm font-semibold text-slate-800">{suggestion}</span>
                      </button>
                    ))}

                  {/* ── Search loading ── */}
                  {isSearchEnabled && isMedicineSearchLoading && (
                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                      약 정보를 검색하고 있습니다…
                    </div>
                  )}

                  {/* ── Search error ── */}
                  {isSearchEnabled && isMedicineSearchError && (
                    <div className="px-4 py-5 text-center text-sm text-red-500">
                      검색 결과를 불러오지 못했습니다.
                    </div>
                  )}

                  {/* ── Search empty ── */}
                  {isSearchEnabled && !isMedicineSearchLoading && !isMedicineSearchError && medicineResults.length === 0 && (
                    <div className="px-4 py-5 text-center text-sm text-slate-400">
                      검색 결과가 없습니다.
                    </div>
                  )}

                  {/* ── Search results list ── */}
                  {isSearchEnabled && !isMedicineSearchLoading && !isMedicineSearchError &&
                    medicineResults.map((medicine, index) => {
                      const medicineId = getMedicineId(medicine) || String(index + 1);
                      const medicineName = getMedicineName(medicine);
                      const safetyInfo = getSafetyInfo(medicine);
                      const generalCautionTags = getGeneralCautionTags(medicine);
                      const isSelected =
                        selectedMedicine !== null &&
                        getMedicineId(selectedMedicine) === getMedicineId(medicine);

                      return (
                        <button
                          key={`${medicineId}-${medicineName}`}
                          type="button"
                          onClick={() => setSelectedMedicineId(getMedicineId(medicine))}
                          className={[
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                            isSelected
                              ? "bg-blue-50 border-l-2 border-blue-500"
                              : "hover:bg-slate-50 border-l-2 border-transparent",
                          ].join(" ")}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {medicineName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {getCompanyName(medicine)}
                            </p>
                            {(safetyInfo.hasWarningMedicine || safetyInfo.hasWarningIngredient || generalCautionTags.length > 0) && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {safetyInfo.hasWarningMedicine && (
                                  <Badge variant="red">주의 약</Badge>
                                )}
                                {safetyInfo.hasWarningIngredient && (
                                  <Badge variant="yellow">주의 성분</Badge>
                                )}
                                {generalCautionTags.length > 0 && (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                    일반 주의 {generalCautionTags.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        <Card>
          {selectedMedicine ? (
            <div className="space-y-5">
              {/* Drug header */}
              <div className="flex gap-4">
                {getImageUrl(selectedMedicine) && (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    <img
                      src={getImageUrl(selectedMedicine)}
                      alt={getMedicineName(selectedMedicine)}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      {getMedicineName(selectedMedicine)}
                    </h2>
                    {getSafetyInfo(selectedMedicine).hasWarningMedicine && (
                      <Badge variant="red">주의 약 포함</Badge>
                    )}
                    {getSafetyInfo(selectedMedicine).hasWarningIngredient && (
                      <Badge variant="yellow">주의 성분 포함</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {getCompanyName(selectedMedicine)}
                  </p>
                  {getUpdateDate(selectedMedicine) && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      공공데이터 수정일: {getUpdateDate(selectedMedicine)}
                    </p>
                  )}
                </div>
              </div>

              {/* Easy summary */}
              <div className="rounded-2xl bg-blue-50 px-4 py-3.5">
                <p className="text-sm leading-6 text-blue-700">
                  {getEasySummary(selectedMedicine)}
                </p>
              </div>

              {/* General caution tags */}
              {getGeneralCautionTags(selectedMedicine).length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">일반 복약 주의</p>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {getGeneralCautionTags(selectedMedicine).length}건
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getGeneralCautionTags(selectedMedicine).map((tag) => {
                      const tagName = getGeneralCautionTagName(tag);
                      return (
                        <span
                          key={`${getGeneralCautionTagCode(tag)}-${tagName}`}
                          className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
                        >
                          {tagName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Accordion sections */}
              <div className="space-y-2">
                <DetailSection
                  title="효능"
                  content={selectedMedicine.efficacy || "효능 정보가 없습니다."}
                />
                <DetailSection
                  title="복용법"
                  content={getUseMethod(selectedMedicine)}
                />
                <DetailSection
                  title="사용 전 경고"
                  content={getWarningBeforeUse(selectedMedicine)}
                />
                <DetailSection
                  title="주의사항"
                  content={selectedMedicine.caution || "주의사항 정보가 없습니다."}
                />
                <DetailSection
                  title="상호작용"
                  content={selectedMedicine.interaction || "상호작용 정보가 없습니다."}
                />
                <DetailSection
                  title="부작용"
                  content={getSideEffect(selectedMedicine)}
                />
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">약을 검색해 보세요</p>
              <p className="mt-1 text-xs text-slate-400">
                왼쪽 검색창에 약 이름이나 성분을 입력하면<br />상세 정보가 여기에 표시됩니다.
              </p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

export default DrugSearchPage;
