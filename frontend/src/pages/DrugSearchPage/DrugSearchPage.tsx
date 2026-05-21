import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, Button, Card, Input } from "../../components/ui";

type DrugCategory = "일반의약품" | "전문의약품";
type AccordionKey = "efficacy" | "dosage" | "caution" | "sideEffect" | "storage";

interface DrugItem {
  id: number;
  itemName: string;
  category: DrugCategory;
  ingredientNames: string[];
  efficacy: string;
  dosage: string;
  caution: string;
  sideEffect: string;
  storage: string;
  aiSummary: string;
  hasCautionMatch: boolean;
  cautionMessage?: string;
}

const mockDrugs: DrugItem[] = [
  {
    id: 1,
    itemName: "아스피린 100mg",
    category: "일반의약품",
    ingredientNames: ["아스피린"],
    efficacy: "혈전 생성을 억제하거나 통증 및 염증 완화에 사용될 수 있습니다.",
    dosage: "일반적으로 1회 1정 복용하며, 복용 목적에 따라 용법이 달라질 수 있습니다.",
    caution: "위장 장애, 출혈 위험이 있는 경우 복용 전 전문가 상담이 필요합니다.",
    sideEffect: "속쓰림, 위장 불편감, 멍, 출혈 경향 등이 나타날 수 있습니다.",
    storage: "직사광선을 피하고 실온에서 보관합니다.",
    aiSummary:
      "아스피린은 통증 완화나 혈전 예방 목적으로 사용될 수 있는 약입니다. 위장 부작용이나 출혈 위험이 있을 수 있어 기존 부작용 이력이 있다면 주의가 필요합니다.",
    hasCautionMatch: true,
    cautionMessage: "내 주의 성분에 등록된 아스피린과 일치합니다.",
  },
  {
    id: 2,
    itemName: "타이레놀 500mg",
    category: "일반의약품",
    ingredientNames: ["아세트아미노펜"],
    efficacy: "두통, 발열, 근육통 등 통증과 열을 완화하는 데 사용됩니다.",
    dosage: "성인은 보통 1회 1~2정 복용하며, 정해진 최대 복용량을 넘기지 않아야 합니다.",
    caution: "간 질환이 있거나 음주가 잦은 경우 복용 전 전문가 상담이 필요합니다.",
    sideEffect: "드물게 발진, 구역감, 간 기능 이상 등이 나타날 수 있습니다.",
    storage: "습기와 직사광선을 피해서 보관합니다.",
    aiSummary:
      "타이레놀은 통증과 열을 줄이는 데 자주 쓰이는 약입니다. 간에 부담이 될 수 있으므로 과다 복용을 피해야 합니다.",
    hasCautionMatch: false,
  },
  {
    id: 3,
    itemName: "암로디핀 5mg",
    category: "전문의약품",
    ingredientNames: ["암로디핀베실산염"],
    efficacy: "고혈압 및 협심증 치료에 사용됩니다.",
    dosage: "의사의 처방에 따라 보통 하루 1회 복용합니다.",
    caution: "어지러움이 나타날 수 있어 복용 초기에는 주의가 필요합니다.",
    sideEffect: "발목 부종, 두통, 얼굴 홍조, 어지러움 등이 나타날 수 있습니다.",
    storage: "실온 보관하며 어린이 손이 닿지 않는 곳에 보관합니다.",
    aiSummary:
      "암로디핀은 혈관을 이완시켜 혈압을 낮추는 약입니다. 꾸준히 복용하는 것이 중요하고, 임의로 중단하지 않는 것이 좋습니다.",
    hasCautionMatch: false,
  },
];

const accordions: { key: AccordionKey; label: string }[] = [
  { key: "efficacy", label: "효능" },
  { key: "dosage", label: "복용법" },
  { key: "caution", label: "주의사항" },
  { key: "sideEffect", label: "부작용" },
  { key: "storage", label: "보관법" },
];

function getCategoryBadgeVariant(category: DrugCategory) {
  return category === "전문의약품" ? "blue" : "green";
}

function DrugSearchPage() {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState(mockDrugs[0].id);
  const [openAccordion, setOpenAccordion] = useState<AccordionKey>("efficacy");

  const filteredDrugs = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword) {
      return mockDrugs;
    }

    return mockDrugs.filter((drug) => {
      const itemNameMatched = drug.itemName.toLowerCase().includes(trimmedKeyword);
      const ingredientMatched = drug.ingredientNames.some((ingredient) =>
        ingredient.toLowerCase().includes(trimmedKeyword)
      );

      return itemNameMatched || ingredientMatched;
    });
  }, [keyword]);

  const selectedDrug =
    mockDrugs.find((drug) => drug.id === selectedDrugId) ?? mockDrugs[0];

  const handleAddSchedule = () => {
    alert("복약 일정 등록 기능은 추후 API 연동 시 연결합니다.");
  };

  const handleGoConsult = () => {
    navigate("/app/chat");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Drug Search</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">약 검색</h1>

        <p className="mt-2 text-slate-500">
          약 이름이나 성분명을 검색하고, 쉬운 설명과 주의사항을 확인합니다.
        </p>
      </div>

      <Card>
        <Input
          label="약 검색"
          placeholder="예: 아스피린, 타이레놀, 암로디핀"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="gray">약명 검색</Badge>
          <Badge variant="gray">성분명 검색</Badge>
          <Badge variant="yellow">주의 성분 비교</Badge>
          <Badge variant="blue">AI 쉬운 설명</Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">검색 결과</h2>
            <Badge variant="blue">{filteredDrugs.length}건</Badge>
          </div>

          <div className="space-y-3">
            {filteredDrugs.map((drug) => {
              const isSelected = selectedDrug.id === drug.id;

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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{drug.itemName}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {drug.ingredientNames.join(", ")}
                      </p>
                    </div>

                    <Badge variant={getCategoryBadgeVariant(drug.category)}>
                      {drug.category}
                    </Badge>
                  </div>

                  {drug.hasCautionMatch && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      주의 성분 매칭
                    </div>
                  )}
                </button>
              );
            })}

            {filteredDrugs.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedDrug.itemName}
                  </h2>

                  <Badge variant={getCategoryBadgeVariant(selectedDrug.category)}>
                    {selectedDrug.category}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  성분: {selectedDrug.ingredientNames.join(", ")}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="border border-slate-200" onClick={handleGoConsult}>
                  약사 문의
                </Button>

                <Button type="button" onClick={handleAddSchedule}>
                  일정 추가
                </Button>
              </div>
            </div>

            {selectedDrug.hasCautionMatch && (
              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="font-bold text-red-700">알레르기/주의 성분 경고</p>
                <p className="mt-2 text-sm text-red-600">
                  {selectedDrug.cautionMessage}
                </p>
              </div>
            )}
          </Card>

          <Card className="bg-blue-50">
            <p className="text-sm font-semibold text-blue-700">AI 쉬운 설명</p>

            <p className="mt-3 leading-7 text-slate-700">
              {selectedDrug.aiSummary}
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">상세 정보</h2>

            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {accordions.map((accordion) => {
                const isOpen = openAccordion === accordion.key;

                return (
                  <div key={accordion.key}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAccordion(isOpen ? "efficacy" : accordion.key)
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-semibold text-slate-900">
                        {accordion.label}
                      </span>

                      <span className="text-sm text-slate-500">
                        {isOpen ? "접기" : "펼치기"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-sm leading-7 text-slate-600">
                        {selectedDrug[accordion.key]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DrugSearchPage;