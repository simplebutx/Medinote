import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "../../components/ui";

type MyPageTab =
  | "profile"
  | "health"
  | "caution"
  | "history"
  | "prescription";

type CautionReason =
  | "ALLERGY"
  | "SIDE_EFFECT"
  | "DOCTOR_ADVICE"
  | "PHARMACIST_ADVICE"
  | "PERSONAL_AVOID"
  | "OTHER";

interface CautionItem {
  id: number;
  drugName?: string;
  ingredientName?: string;
  reason: CautionReason;
  memo: string;
}

const reasonOptions: { label: string; value: CautionReason }[] = [
  { label: "알레르기", value: "ALLERGY" },
  { label: "부작용", value: "SIDE_EFFECT" },
  { label: "의사 권고", value: "DOCTOR_ADVICE" },
  { label: "약사 권고", value: "PHARMACIST_ADVICE" },
  { label: "개인 회피", value: "PERSONAL_AVOID" },
  { label: "기타", value: "OTHER" },
];

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

function getReasonLabel(reason: CautionReason) {
  return reasonOptions.find((option) => option.value === reason)?.label ?? "기타";
}

function getReasonBadge(reason: CautionReason) {
  if (reason === "ALLERGY") return "red";
  if (reason === "SIDE_EFFECT") return "yellow";
  if (reason === "DOCTOR_ADVICE" || reason === "PHARMACIST_ADVICE") {
    return "blue";
  }
  return "gray";
}

const tabs: { label: string; value: MyPageTab }[] = [
  { label: "기본 정보", value: "profile" },
  { label: "건강 정보", value: "health" },
  { label: "알레르기/주의 성분", value: "caution" },
  { label: "복약 이력", value: "history" },
  { label: "처방전", value: "prescription" },
];

const initialCautionItems: CautionItem[] = [
  {
    id: 1,
    drugName: "페니실린",
    ingredientName: "페니실린계",
    reason: "ALLERGY",
    memo: "두드러기, 호흡 곤란 이력",
  },
  {
    id: 2,
    drugName: "아스피린",
    ingredientName: "아스피린",
    reason: "SIDE_EFFECT",
    memo: "복용 후 심한 속쓰림",
  },
  {
    id: 3,
    drugName: "",
    ingredientName: "NSAIDs",
    reason: "PERSONAL_AVOID",
    memo: "위장 장애 우려로 주의",
  },
];

const adherenceItems = [
  { drugName: '아스피린 100mg', rate: 92 },
  { drugName: '암로디핀 5mg', rate: 86 },
  { drugName: '타이레놀 500mg', rate: 74 },
];

const prescriptions = [
  {
    id: 1,
    title: '내과 처방전',
    date: '2026.05.12',
    status: '복용 중',
    medicines: ['아스피린 100mg', '암로디핀 5mg'],
  },
  {
    id: 2,
    title: '두통 관련 처방',
    date: '2026.05.03',
    status: '종료',
    medicines: ['타이레놀 500mg'],
  },
];

function MyPage() {
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');
  const [isPregnant, setIsPregnant] = useState(false);
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [isSmoking, setIsSmoking] = useState(true);
  const [isDrinking, setIsDrinking] = useState(false);

  const [healthDiseaseKeyword, setHealthDiseaseKeyword] = useState("");
  const [isHealthDiseaseSearchOpen, setIsHealthDiseaseSearchOpen] =
    useState(false);
  const [selectedHealthDiseases, setSelectedHealthDiseases] = useState<
    DiseaseOption[]
  >([
    { code: "I10", name: "고혈압" },
    { code: "K29", name: "위염" },
  ]);

  const filteredHealthDiseases = useMemo(() => {
    const keyword = healthDiseaseKeyword.trim().replace("@", "").toLowerCase();

    if (!keyword) {
      return diseaseOptions;
    }

    return diseaseOptions.filter((disease) =>
      disease.name.toLowerCase().includes(keyword)
    );
  }, [healthDiseaseKeyword]);

  const handleChangeHealthDiseaseKeyword = (value: string) => {
    setHealthDiseaseKeyword(value);

    if (value.startsWith("@")) {
      setIsHealthDiseaseSearchOpen(true);
      return;
    }

    setIsHealthDiseaseSearchOpen(false);
  };

  const handleSelectHealthDisease = (disease: DiseaseOption) => {
    setSelectedHealthDiseases((prev) => {
      const alreadySelected = prev.some((item) => item.code === disease.code);

      if (alreadySelected) {
        return prev;
      }

      return [...prev, disease];
    });

    setHealthDiseaseKeyword("");
    setIsHealthDiseaseSearchOpen(false);
  };

  const handleRemoveHealthDisease = (diseaseCode: string) => {
    setSelectedHealthDiseases((prev) =>
      prev.filter((disease) => disease.code !== diseaseCode)
    );
  };

  const handleSaveHealthInfo = () => {
    alert("건강 정보가 저장되었습니다. 추후 API 연동 시 실제 저장 처리합니다.");
  };

  const [cautionList, setCautionList] = useState<CautionItem[]>(
    initialCautionItems
  );

  const [isCautionFormOpen, setIsCautionFormOpen] = useState(false);
  const [drugName, setDrugName] = useState("");
  const [ingredientName, setIngredientName] = useState("");
  const [reason, setReason] = useState<CautionReason>("ALLERGY");
  const [memo, setMemo] = useState("");

  const handleAddCaution = () => {
    if (!drugName.trim() && !ingredientName.trim()) {
      alert("약 이름 또는 성분명 중 하나는 입력해주세요.");
      return;
    }

    const newItem: CautionItem = {
      id: Date.now(),
      drugName: drugName.trim(),
      ingredientName: ingredientName.trim(),
      reason,
      memo: memo.trim(),
    };

    setCautionList((prev) => [newItem, ...prev]);

    setDrugName("");
    setIngredientName("");
    setReason("ALLERGY");
    setMemo("");
    setIsCautionFormOpen(false);
  };

  const handleDeleteCaution = (id: number) => {
    setCautionList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">My Page</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">내 정보</h1>

        <p className="mt-2 text-slate-500">
          기본 정보, 알레르기/주의 성분, 복약 이력, 처방전 정보를 관리합니다.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                오
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">오충환</h2>
                <p className="text-sm text-slate-500">user@example.com</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="blue">일반 사용자</Badge>
              <Badge variant="green">활성 계정</Badge>
              <Badge variant="yellow">주의 성분 {cautionList.length}건</Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200"
          >
            프로필 수정
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  'min-w-fit px-5 py-4 text-sm font-semibold transition',
                  isActive
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">기본 정보</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이름</p>
                  <p className="mt-2 font-semibold text-slate-900">오충환</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이메일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    user@example.com
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">생년월일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    1998.05.12
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">성별</p>
                  <p className="mt-2 font-semibold text-slate-900">남성</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "health" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">건강 정보</h2>
                <p className="mt-1 text-sm text-slate-500">
                  복약 안내와 약사 상담에 참고되는 건강 상태와 기저질환 정보를 관리합니다.
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">건강 상태</p>

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
                <p className="mb-3 text-sm font-medium text-slate-700">기저질환</p>

                {selectedHealthDiseases.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedHealthDiseases.map((disease) => (
                      <button
                        key={disease.code}
                        type="button"
                        onClick={() => handleRemoveHealthDisease(disease.code)}
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
                    value={healthDiseaseKeyword}
                    onChange={(event) =>
                      handleChangeHealthDiseaseKeyword(event.target.value)
                    }
                  />

                  {isHealthDiseaseSearchOpen && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                        기저질환 검색 결과
                      </div>

                      <div className="max-h-56 overflow-y-auto">
                        {filteredHealthDiseases.map((disease) => (
                          <button
                            key={disease.code}
                            type="button"
                            onClick={() => handleSelectHealthDisease(disease)}
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

                        {filteredHealthDiseases.length === 0 && (
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
                건강 정보는 약 검색, AI 챗봇, 약사 상담에서 참고 정보로 활용됩니다.
                알레르기/주의 성분은 별도 탭에서 관리합니다.
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSaveHealthInfo}>
                  건강 정보 저장
                </Button>
              </div>
            </div>
          )}

          {activeTab === "caution" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    알레르기/주의 성분
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    OCR, 약 검색, 약사 상담에서 참고되는 정보입니다.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCautionFormOpen((prev) => !prev)}
                >
                  {isCautionFormOpen ? "닫기" : "추가"}
                </Button>
              </div>

              {isCautionFormOpen && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="font-bold text-slate-900">
                    주의 성분 추가
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label="약 이름"
                      placeholder="예: 아스피린"
                      value={drugName}
                      onChange={(event) => setDrugName(event.target.value)}
                    />

                    <Input
                      label="성분명"
                      placeholder="예: NSAIDs"
                      value={ingredientName}
                      onChange={(event) => setIngredientName(event.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      사유
                    </p>

                    <select
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value as CautionReason)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {reasonOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4">
                    <Input
                      label="메모"
                      placeholder="예: 복용 후 속쓰림이 심했음"
                      value={memo}
                      onChange={(event) => setMemo(event.target.value)}
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="border border-slate-200"
                      onClick={() => setIsCautionFormOpen(false)}
                    >
                      취소
                    </Button>

                    <Button type="button" onClick={handleAddCaution}>
                      저장
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {cautionList.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {item.drugName || item.ingredientName}
                        </p>

                        <Badge variant={getReasonBadge(item.reason)}>
                          {getReasonLabel(item.reason)}
                        </Badge>
                      </div>

                      {item.drugName && item.ingredientName && (
                        <p className="mt-1 text-sm text-slate-500">
                          성분명: {item.ingredientName}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-500">
                        {item.memo || "등록된 메모가 없습니다."}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-slate-200"
                      >
                        수정
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-slate-200"
                        onClick={() => handleDeleteCaution(item.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900">복약 이력</h2>

              {adherenceItems.map((item) => (
                <div key={item.drugName}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">
                      {item.drugName}
                    </p>
                    <p className="text-sm text-slate-500">{item.rate}%</p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">처방전</h2>

              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {prescription.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {prescription.date}
                      </p>
                    </div>

                    <Badge
                      variant={
                        prescription.status === '복용 중' ? 'green' : 'gray'
                      }
                    >
                      {prescription.status}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {prescription.medicines.map((medicine) => (
                      <Badge key={medicine} variant="blue">
                        {medicine}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="border-red-100 bg-red-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-red-700">회원 탈퇴</h2>

            <p className="mt-2 text-sm text-red-600">
              탈퇴 시 복약 일정, 상담 내역, 알림 설정 등 계정 관련 정보가
              비활성화됩니다.
            </p>
          </div>

          <Button type="button" variant="danger">
            회원 탈퇴
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default MyPage;
