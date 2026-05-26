import { useMemo, useState } from "react";

import { Badge, Button, Card, Input } from "../../components/ui";

type DrugType = "OTC" | "PRESCRIPTION";
type SafetyLevel = "SAFE" | "CAUTION" | "WARNING";

interface DrugItem {
  id: number;
  name: string;
  manufacturer: string;
  type: DrugType;
  ingredients: string[];
  efficacy: string;
  dosage: string;
  caution: string;
  sideEffects: string;
  storage: string;
  aiSummary: string;
  safetyLevel: SafetyLevel;
  cautionMessage?: string;
}

const mockDrugs: DrugItem[] = [
  {
    id: 1,
    name: "타이레놀정 500mg",
    manufacturer: "한국얀센",
    type: "OTC",
    ingredients: ["아세트아미노펜"],
    efficacy: "감기로 인한 발열 및 통증, 두통, 근육통, 생리통 완화에 사용됩니다.",
    dosage: "성인 기준 1회 1~2정씩 필요 시 복용할 수 있습니다.",
    caution:
      "술을 자주 마시는 경우 간 손상 위험이 있을 수 있으므로 복용 전 전문가와 상담이 필요합니다.",
    sideEffects: "드물게 피부 발진, 구역감, 간 기능 이상 등이 보고될 수 있습니다.",
    storage: "실온에서 보관하고, 어린이의 손이 닿지 않는 곳에 보관합니다.",
    aiSummary:
      "타이레놀은 열을 내리거나 통증을 줄일 때 사용하는 약입니다. 다만 술을 자주 마시는 경우에는 간에 부담이 될 수 있어 주의가 필요합니다.",
    safetyLevel: "SAFE",
  },
  {
    id: 2,
    name: "아스피린 프로텍트정 100mg",
    manufacturer: "바이엘코리아",
    type: "PRESCRIPTION",
    ingredients: ["아스피린"],
    efficacy: "혈전 생성을 억제하여 심혈관 질환 예방 목적으로 사용될 수 있습니다.",
    dosage: "일반적으로 1일 1회 복용하지만, 처방에 따라 달라질 수 있습니다.",
    caution:
      "위장장애, 출혈 위험이 있을 수 있으므로 위장 질환이나 출혈 위험이 있는 경우 주의가 필요합니다.",
    sideEffects: "속쓰림, 위통, 멍, 출혈 경향 등이 나타날 수 있습니다.",
    storage: "습기를 피하고 실온에서 보관합니다.",
    aiSummary:
      "아스피린은 혈액이 뭉치는 것을 줄이는 데 쓰일 수 있는 약입니다. 위장 불편감이나 출혈 위험이 있는 사람은 특히 주의해야 합니다.",
    safetyLevel: "WARNING",
    cautionMessage: "내 주의 성분에 등록된 아스피린과 일치합니다.",
  },
  {
    id: 3,
    name: "부루펜정 200mg",
    manufacturer: "삼일제약",
    type: "OTC",
    ingredients: ["이부프로펜", "NSAIDs"],
    efficacy: "해열, 진통, 소염 작용을 통해 통증과 염증을 완화합니다.",
    dosage: "증상에 따라 복용하며, 공복 복용은 위장장애를 유발할 수 있습니다.",
    caution:
      "위궤양, 신장 질환, NSAIDs 과민 이력이 있는 경우 주의가 필요합니다.",
    sideEffects: "속쓰림, 위통, 소화불량, 어지러움 등이 나타날 수 있습니다.",
    storage: "직사광선을 피하고 실온 보관합니다.",
    aiSummary:
      "부루펜은 열과 통증, 염증을 줄이는 약입니다. 위장에 부담이 될 수 있어 식후 복용이 더 안전할 수 있습니다.",
    safetyLevel: "CAUTION",
    cautionMessage: "내 주의 성분에 등록된 NSAIDs 계열과 관련이 있습니다.",
  },
  {
    id: 4,
    name: "활명수",
    manufacturer: "동화약품",
    type: "OTC",
    ingredients: ["현호색", "진피", "건강"],
    efficacy: "소화불량, 과식, 체함 증상 완화에 사용됩니다.",
    dosage: "제품 설명서 또는 약사의 안내에 따라 복용합니다.",
    caution:
      "증상이 오래 지속되거나 심한 복통이 있는 경우에는 전문가 상담이 필요합니다.",
    sideEffects: "개인에 따라 속불편감이나 알레르기 반응이 나타날 수 있습니다.",
    storage: "직사광선을 피하고 실온에서 보관합니다.",
    aiSummary:
      "활명수는 체했거나 소화가 잘 안 될 때 사용하는 소화제입니다. 복통이 심하거나 증상이 계속되면 약사 상담이 필요합니다.",
    safetyLevel: "SAFE",
  },
];

function getDrugTypeLabel(type: DrugType) {
  return type === "OTC" ? "일반의약품" : "전문의약품";
}

function getDrugTypeBadge(type: DrugType) {
  return type === "OTC" ? "green" : "blue";
}

function getSafetyBadge(level: SafetyLevel) {
  if (level === "WARNING") return "red";
  if (level === "CAUTION") return "yellow";
  return "green";
}

function getSafetyLabel(level: SafetyLevel) {
  if (level === "WARNING") return "주의 필요";
  if (level === "CAUTION") return "확인 필요";
  return "일반";
}

function DrugSearchPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(1);

  const filteredDrugs = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) {
      return mockDrugs;
    }

    return mockDrugs.filter((drug) => {
      const searchableText = [
        drug.name,
        drug.manufacturer,
        ...drug.ingredients,
        drug.efficacy,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(trimmedKeyword);
    });
  }, [keyword]);

  const selectedDrug = filteredDrugs.find((drug) => drug.id === selectedDrugId);

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
          placeholder="예: 타이레놀, 아스피린, NSAIDs"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {["타이레놀", "아스피린", "NSAIDs", "활명수"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKeyword(item)}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            >
              #{item}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">검색 결과</h2>
            <Badge variant="blue">{filteredDrugs.length}건</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {filteredDrugs.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredDrugs.map((drug) => {
                const isSelected = selectedDrugId === drug.id;

                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => setSelectedDrugId(drug.id)}
                    className={[
                      "w-full rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{drug.name}</p>

                      <Badge variant={getDrugTypeBadge(drug.type)}>
                        {getDrugTypeLabel(drug.type)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {drug.manufacturer}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      성분: {drug.ingredients.join(", ")}
                    </p>

                    {drug.cautionMessage && (
                      <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {drug.cautionMessage}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          {selectedDrug ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedDrug.name}
                    </h2>

                    <Badge variant={getDrugTypeBadge(selectedDrug.type)}>
                      {getDrugTypeLabel(selectedDrug.type)}
                    </Badge>

                    <Badge variant={getSafetyBadge(selectedDrug.safetyLevel)}>
                      {getSafetyLabel(selectedDrug.safetyLevel)}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {selectedDrug.manufacturer}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddSchedule(selectedDrug.name)}
                  >
                    일정 추가
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={() => handleAskPharmacist(selectedDrug.name)}
                  >
                    약사 문의
                  </Button>
                </div>
              </div>

              {selectedDrug.cautionMessage && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium leading-6 text-red-700">
                  {selectedDrug.cautionMessage}
                </div>
              )}

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-700">
                  AI 쉬운 설명
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-700">
                  {selectedDrug.aiSummary}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">성분</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedDrug.ingredients.join(", ")}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">보관법</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedDrug.storage}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    효능
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedDrug.efficacy}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    복용법
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedDrug.dosage}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    주의사항
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedDrug.caution}
                  </p>
                </details>

                <details className="rounded-2xl border border-slate-200 p-4">
                  <summary className="cursor-pointer font-bold text-slate-900">
                    부작용
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedDrug.sideEffects}
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