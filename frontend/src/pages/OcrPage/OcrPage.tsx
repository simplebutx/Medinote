import { useState } from "react";
import { Badge, Button, Card, Input } from "../../components/ui";

type RegisterMode = "manual" | "ocr";
type DosageUnit = "정" | "캡슐" | "포" | "ml";
type TimingType = "식후" | "식전" | "식사 중" | "공복" | "취침 전" | "상관없음";
type OcrStep = "idle" | "analyzing" | "completed";

interface MedicationForm {
  medicineName: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  timesPerDay: string;
  timing: TimingType;
  durationDays: string;
  startDate: string;
}

interface MedicationPreview {
  id: number;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  timesPerDay: number;
  timing: TimingType;
  durationDays: number;
  startDate: string;
  cautionMessage?: string;
}

const initialManualForm: MedicationForm = {
  medicineName: "",
  dosageAmount: "1",
  dosageUnit: "정",
  timesPerDay: "3",
  timing: "식후",
  durationDays: "3",
  startDate: "2026-05-24",
};

const mockOcrResults: MedicationPreview[] = [
  {
    id: 1,
    medicineName: "타이레놀정 500mg",
    dosageAmount: "1",
    dosageUnit: "정",
    timesPerDay: 3,
    timing: "식후",
    durationDays: 3,
    startDate: "2026-05-24",
  },
  {
    id: 2,
    medicineName: "아스피린 100mg",
    dosageAmount: "1",
    dosageUnit: "정",
    timesPerDay: 1,
    timing: "식후",
    durationDays: 7,
    startDate: "2026-05-24",
    cautionMessage: "내 주의 성분에 등록된 아스피린과 일치합니다.",
  },
];

function OcrPage() {
  const [activeMode, setActiveMode] = useState<RegisterMode>("manual");
  const [manualForm, setManualForm] =
    useState<MedicationForm>(initialManualForm);
  const [manualItems, setManualItems] = useState<MedicationPreview[]>([]);
  const [ocrStep, setOcrStep] = useState<OcrStep>("idle");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [ocrResults, setOcrResults] = useState<MedicationPreview[]>([]);

  const handleChangeManualForm = (
    key: keyof MedicationForm,
    value: string
  ) => {
    setManualForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddManualMedication = () => {
    if (!manualForm.medicineName.trim()) {
      alert("약 이름을 입력해주세요.");
      return;
    }

    const newMedication: MedicationPreview = {
      id: Date.now(),
      medicineName: manualForm.medicineName.trim(),
      dosageAmount: manualForm.dosageAmount,
      dosageUnit: manualForm.dosageUnit,
      timesPerDay: Number(manualForm.timesPerDay),
      timing: manualForm.timing,
      durationDays: Number(manualForm.durationDays),
      startDate: manualForm.startDate,
    };

    setManualItems((prev) => [newMedication, ...prev]);
    setManualForm(initialManualForm);
  };

  const handleRemoveManualMedication = (id: number) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAnalyzeOcr = () => {
    if (!selectedFileName) {
      alert("처방전 또는 약봉투 이미지를 먼저 선택해주세요.");
      return;
    }

    setOcrStep("analyzing");

    window.setTimeout(() => {
      setOcrResults(mockOcrResults);
      setOcrStep("completed");
    }, 1200);
  };

  const handleRegisterSchedule = (items: MedicationPreview[]) => {
    if (items.length === 0) {
      alert("등록할 복약 정보가 없습니다.");
      return;
    }

    alert("복약 일정 등록 기능은 추후 API 연동 시 실제 저장 처리합니다.");
  };

  const renderMedicationCard = (
    item: MedicationPreview,
    onRemove?: (id: number) => void
  ) => {
    return (
      <div
        key={item.id}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-900">
                {item.medicineName}
              </p>

              <Badge variant="blue">
                {item.timesPerDay}회/일
              </Badge>

              <Badge variant="gray">
                {item.durationDays}일분
              </Badge>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              1회 {item.dosageAmount}
              {item.dosageUnit} · {item.timing} · 시작일 {item.startDate}
            </p>

            {item.cautionMessage && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {item.cautionMessage}
              </div>
            )}
          </div>

          {onRemove && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="border border-slate-200"
              onClick={() => onRemove(item.id)}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Medication Register
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          복약 등록
        </h1>

        <p className="mt-2 text-slate-500">
          복용할 약을 직접 입력하거나 처방전/약봉투 이미지를 업로드해 복약
          일정을 등록합니다.
        </p>
      </div>

      <Card className="p-0">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode("manual")}
            className={[
              "flex-1 px-5 py-4 text-sm font-semibold transition",
              activeMode === "manual"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            수동 입력
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("ocr")}
            className={[
              "flex-1 px-5 py-4 text-sm font-semibold transition",
              activeMode === "ocr"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            처방전 업로드
          </button>
        </div>

        <div className="p-6">
          {activeMode === "manual" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  수동 입력
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  약 이름, 복용량, 복용 횟수와 기간을 직접 입력합니다.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="약 이름"
                  placeholder="예: 타이레놀정 500mg"
                  value={manualForm.medicineName}
                  onChange={(event) =>
                    handleChangeManualForm("medicineName", event.target.value)
                  }
                />

                <Input
                  label="1회 복용량"
                  placeholder="예: 1"
                  value={manualForm.dosageAmount}
                  onChange={(event) =>
                    handleChangeManualForm("dosageAmount", event.target.value)
                  }
                />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    복용 단위
                  </p>

                  <select
                    value={manualForm.dosageUnit}
                    onChange={(event) =>
                      handleChangeManualForm(
                        "dosageUnit",
                        event.target.value as DosageUnit
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="정">정</option>
                    <option value="캡슐">캡슐</option>
                    <option value="포">포</option>
                    <option value="ml">ml</option>
                  </select>
                </div>

                <Input
                  label="하루 복용 횟수"
                  placeholder="예: 3"
                  value={manualForm.timesPerDay}
                  onChange={(event) =>
                    handleChangeManualForm("timesPerDay", event.target.value)
                  }
                />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    복용 시점
                  </p>

                  <select
                    value={manualForm.timing}
                    onChange={(event) =>
                      handleChangeManualForm(
                        "timing",
                        event.target.value as TimingType
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="식후">식후</option>
                    <option value="식전">식전</option>
                    <option value="식사 중">식사 중</option>
                    <option value="공복">공복</option>
                    <option value="취침 전">취침 전</option>
                    <option value="상관없음">상관없음</option>
                  </select>
                </div>

                <Input
                  label="복용 기간"
                  placeholder="예: 3"
                  value={manualForm.durationDays}
                  onChange={(event) =>
                    handleChangeManualForm("durationDays", event.target.value)
                  }
                />

                <Input
                  label="복용 시작일"
                  type="date"
                  value={manualForm.startDate}
                  onChange={(event) =>
                    handleChangeManualForm("startDate", event.target.value)
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleAddManualMedication}>
                  복약 정보 추가
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    등록 예정 목록
                  </h3>

                  <Badge variant="blue">
                    {manualItems.length}건
                  </Badge>
                </div>

                {manualItems.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    아직 추가된 복약 정보가 없습니다.
                  </div>
                ) : (
                  manualItems.map((item) =>
                    renderMedicationCard(item, handleRemoveManualMedication)
                  )
                )}
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                수동 입력 정보는 추후 복약 일정 API와 연결됩니다. 현재는 화면
                흐름 확인용 Mock 데이터입니다.
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => handleRegisterSchedule(manualItems)}
                >
                  복약 일정 등록
                </Button>
              </div>
            </div>
          )}

          {activeMode === "ocr" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  처방전 업로드
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  처방전이나 약봉투 이미지를 업로드하면 OCR 분석 결과를 바탕으로
                  복약 일정 후보를 생성합니다.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-lg font-bold text-slate-900">
                  처방전 또는 약봉투 이미지 업로드
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  jpg, png 파일을 선택할 수 있습니다.
                </p>

                <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  이미지 선택
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        setSelectedFileName(file.name);
                        setOcrStep("idle");
                        setOcrResults([]);
                      }
                    }}
                  />
                </label>

                {selectedFileName && (
                  <p className="mt-4 text-sm font-medium text-blue-700">
                    선택된 파일: {selectedFileName}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleAnalyzeOcr}>
                  OCR 분석 시작
                </Button>
              </div>

              {ocrStep === "analyzing" && (
                <Card className="bg-blue-50">
                  <p className="font-bold text-blue-700">
                    OCR 분석 중입니다.
                  </p>

                  <p className="mt-2 text-sm text-blue-700">
                    이미지에서 약 이름, 복용량, 복용 횟수와 복용 기간을 추출하고
                    있습니다.
                  </p>
                </Card>
              )}

              {ocrStep === "completed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      OCR 분석 결과
                    </h3>

                    <Badge variant="green">
                      {ocrResults.length}건 추출
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {ocrResults.map((item) => renderMedicationCard(item))}
                  </div>

                  <div className="rounded-2xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-700">
                    OCR 결과는 실제 처방과 다를 수 있으므로, 복약 일정 등록 전
                    약 이름과 복용법을 반드시 확인해주세요.
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => handleRegisterSchedule(ocrResults)}
                    >
                      분석 결과로 복약 일정 등록
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default OcrPage;