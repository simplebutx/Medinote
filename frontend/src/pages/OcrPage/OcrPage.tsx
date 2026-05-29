import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Input } from '../../components/ui';
import {
  useCreateMedicationSchedule,
  useCreateMedicationScheduleTime,
} from '../../features/schedule/hooks';
import type {
  DosageUnit as ApiDosageUnit,
  MedicationTiming,
} from '../../features/schedule/types/schedule.types';
import { useMedicineSearch } from '../../features/drug/hooks';
import type { MedicineSearchItem } from '../../features/drug/types/drug.types';
import { useDebounce } from '../../hooks/useDebounce';

type RegisterMode = 'manual' | 'ocr';
type DosageUnit = '정' | '캡슐' | '포' | 'ml';
type TimingType = '식후' | '식전' | '식사 중' | '공복' | '취침 전' | '상관없음';
type OcrStep = 'idle' | 'analyzing' | 'completed';

interface PrescriptionCommonForm {
  hospitalName: string;
  pharmacyName: string;
  startDate: string;
  durationDays: string;
}

interface DoseTimeForm {
  label: string;
  takeTime: string;
  timing: TimingType;
}

interface MedicationForm {
  medicineId?: number | null;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  timesPerDay: string;
  doseTimes: DoseTimeForm[];
}

interface MedicationPreview {
  id: number;
  medicineId?: number | null;
  medicineName: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  timesPerDay: number;
  doseTimes: DoseTimeForm[];
  cautionMessage?: string;
}

const initialCommonForm: PrescriptionCommonForm = {
  hospitalName: '',
  pharmacyName: '',
  startDate: '2026-05-24',
  durationDays: '3',
};

function getDefaultDoseTimes(timesPerDay: number): DoseTimeForm[] {
  if (timesPerDay <= 1) {
    return [{ label: '아침', takeTime: '08:00', timing: '식후' }];
  }

  if (timesPerDay === 2) {
    return [
      { label: '아침', takeTime: '08:00', timing: '식후' },
      { label: '저녁', takeTime: '18:00', timing: '식후' },
    ];
  }

  if (timesPerDay === 3) {
    return [
      { label: '아침', takeTime: '08:00', timing: '식후' },
      { label: '점심', takeTime: '12:00', timing: '식후' },
      { label: '저녁', takeTime: '18:00', timing: '식후' },
    ];
  }

  return [
    { label: '아침', takeTime: '08:00', timing: '식후' },
    { label: '점심', takeTime: '12:00', timing: '식후' },
    { label: '저녁', takeTime: '18:00', timing: '식후' },
    { label: '취침', takeTime: '23:00', timing: '취침 전' },
  ];
}

function normalizeTakeTime(time: string) {
  return time.slice(0, 5);
}

const initialManualForm: MedicationForm = {
  medicineId: null,
  medicineName: '',
  dosageAmount: '1',
  dosageUnit: '정',
  timesPerDay: '3',
  doseTimes: getDefaultDoseTimes(3),
};

const mockOcrResults: MedicationPreview[] = [
  {
    id: 1,
    medicineId: null,
    medicineName: '타이레놀정 500mg',
    dosageAmount: '1',
    dosageUnit: '정',
    timesPerDay: 3,
    doseTimes: getDefaultDoseTimes(3),
  },
  {
    id: 2,
    medicineId: null,
    medicineName: '아스피린 100mg',
    dosageAmount: '1',
    dosageUnit: '정',
    timesPerDay: 1,
    doseTimes: getDefaultDoseTimes(1),
    cautionMessage: '내 주의 성분에 등록된 아스피린과 일치합니다.',
  },
];

function getMedicineId(medicine: MedicineSearchItem) {
  return medicine.itemSeq ?? medicine.item_seq ?? null;
}

function getMedicineName(medicine: MedicineSearchItem) {
  return medicine.itemName ?? medicine.item_name ?? '약 이름 정보 없음';
}

function getCompanyName(medicine: MedicineSearchItem) {
  return medicine.companyName ?? medicine.company_name ?? '제조사 정보 없음';
}

function mapDosageUnit(unit: DosageUnit): ApiDosageUnit {
  if (unit === '정') return 'TABLET';
  if (unit === '캡슐') return 'CAPSULE';
  if (unit === '포') return 'PACK';
  if (unit === 'ml') return 'ML';

  return 'OTHER';
}

function mapTiming(timing: TimingType): MedicationTiming {
  if (timing === '식후') return 'AFTER_MEAL';
  if (timing === '식전') return 'BEFORE_MEAL';
  if (timing === '식사 중') return 'WITH_MEAL';
  if (timing === '공복') return 'EMPTY_STOMACH';
  if (timing === '취침 전') return 'BEDTIME';

  return 'ANYTIME';
}

function OcrPage() {
  const navigate = useNavigate();

  const createScheduleMutation = useCreateMedicationSchedule();
  const createScheduleTimeMutation = useCreateMedicationScheduleTime();

  const isRegistering =
    createScheduleMutation.isPending || createScheduleTimeMutation.isPending;
  const [activeMode, setActiveMode] = useState<RegisterMode>('manual');

  const [commonForm, setCommonForm] =
    useState<PrescriptionCommonForm>(initialCommonForm);

  const handleChangeCommonForm = (
    key: keyof PrescriptionCommonForm,
    value: string,
  ) => {
    setCommonForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const [manualForm, setManualForm] =
    useState<MedicationForm>(initialManualForm);
  const [manualItems, setManualItems] = useState<MedicationPreview[]>([]);

  const [selectedManualMedicine, setSelectedManualMedicine] =
    useState<MedicineSearchItem | null>(null);

  const [isMedicineSearchOpen, setIsMedicineSearchOpen] = useState(false);

  const debouncedMedicineKeyword = useDebounce(manualForm.medicineName, 300);

  const {
    data: medicineSearchResults = [],
    isLoading: isMedicineSearchLoading,
  } = useMedicineSearch(
    debouncedMedicineKeyword.trim().length >= 2
      ? debouncedMedicineKeyword.trim()
      : '',
  );

  const [ocrStep, setOcrStep] = useState<OcrStep>('idle');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [ocrResults, setOcrResults] = useState<MedicationPreview[]>([]);

  const handleChangeManualForm = (key: keyof MedicationForm, value: string) => {
    setManualForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const [editingManualItemId, setEditingManualItemId] = useState<number | null>(
    null,
  );

  const handleStartEditManualMedication = (item: MedicationPreview) => {
    setEditingManualItemId(item.id);

    setManualForm({
      medicineId: item.medicineId ?? null,
      medicineName: item.medicineName,
      dosageAmount: item.dosageAmount,
      dosageUnit: item.dosageUnit,
      timesPerDay: String(item.timesPerDay),
      doseTimes: item.doseTimes,
    });

    setSelectedManualMedicine(null);
    setIsMedicineSearchOpen(false);
  };

  const handleAddManualMedication = () => {
    if (!manualForm.medicineName.trim()) {
      alert('약 이름을 입력해주세요.');
      return;
    }

    const newMedication: MedicationPreview = {
      id: Date.now(),
      medicineId: selectedManualMedicine
        ? getMedicineId(selectedManualMedicine)
        : null,
      medicineName: selectedManualMedicine
        ? getMedicineName(selectedManualMedicine)
        : manualForm.medicineName.trim(),
      dosageAmount: manualForm.dosageAmount,
      dosageUnit: manualForm.dosageUnit,
      timesPerDay: Number(manualForm.timesPerDay),
      doseTimes: manualForm.doseTimes,
    };

    if (editingManualItemId !== null) {
      setManualItems((prev) =>
        prev.map((item) =>
          item.id === editingManualItemId
            ? {
                ...newMedication,
                id: editingManualItemId,
              }
            : item,
        ),
      );
    } else {
      setManualItems((prev) => [newMedication, ...prev]);
    }

    setEditingManualItemId(null);

    setManualForm(initialManualForm);
    setSelectedManualMedicine(null);
    setIsMedicineSearchOpen(false);
  };

  const handleChangeManualTimesPerDay = (value: string) => {
    const nextTimesPerDay = Number(value);

    setManualForm((prev) => ({
      ...prev,
      timesPerDay: value,
      doseTimes: getDefaultDoseTimes(nextTimesPerDay),
    }));
  };

  const handleChangeDoseTime = (
    index: number,
    key: keyof DoseTimeForm,
    value: string,
  ) => {
    setManualForm((prev) => ({
      ...prev,
      doseTimes: prev.doseTimes.map((doseTime, doseIndex) =>
        doseIndex === index
          ? {
              ...doseTime,
              [key]: value,
            }
          : doseTime,
      ),
    }));
  };

  const handleRemoveManualMedication = (id: number) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAnalyzeOcr = () => {
    if (!selectedFileName) {
      alert('처방전 또는 약봉투 이미지를 먼저 선택해주세요.');
      return;
    }

    setOcrStep('analyzing');

    window.setTimeout(() => {
      setOcrResults(mockOcrResults);
      setOcrStep('completed');
    }, 1200);
  };

  const handleRegisterSchedule = async (items: MedicationPreview[]) => {
    if (items.length === 0) {
      toast.error('등록할 복약 정보가 없습니다.');
      return;
    }

    if (!commonForm.startDate) {
      toast.error('복용 시작일을 입력해주세요.');
      return;
    }

    if (!commonForm.durationDays || Number(commonForm.durationDays) <= 0) {
      toast.error('복용 기간을 입력해주세요.');
      return;
    }

    try {
      const createdSchedule = await createScheduleMutation.mutateAsync({
        hospitalName: commonForm.hospitalName.trim() || null,
        pharmacyName: commonForm.pharmacyName.trim() || null,
        prescribedDate: commonForm.startDate,
        dispensedDate: commonForm.startDate,
        medicines: items.map((item) => ({
          medicineId: item.medicineId ?? null,
          customMedicineName: item.medicineName,
          dosageAmount: Number(item.dosageAmount),
          dosageUnit: mapDosageUnit(item.dosageUnit),
          frequencyType: 'DAILY',
          timesPerDay: item.timesPerDay,
          intervalHours: null,
          durationDays: Number(commonForm.durationDays),
          startDate: commonForm.startDate,
        })),
      });

      const createdMedicines =
        createdSchedule.medicines ??
        createdSchedule.medicationScheduleMedicines ??
        [];

      if (createdMedicines.length === 0) {
        throw new Error(
          '복약 일정은 생성됐지만, 응답에서 약별 ID를 찾지 못했습니다.',
        );
      }

      for (const [itemIndex, item] of items.entries()) {
        const createdMedicine = createdMedicines[itemIndex];

        if (!createdMedicine?.id) {
          throw new Error('복약 시간 등록에 필요한 약별 ID가 없습니다.');
        }

        await Promise.all(
          item.doseTimes.map((doseTime, doseIndex) =>
            createScheduleTimeMutation.mutateAsync({
              medicationScheduleMedicineId: createdMedicine.id,
              timing: mapTiming(doseTime.timing),
              takeTime: normalizeTakeTime(doseTime.takeTime),
              sortOrder: doseIndex + 1,
            }),
          ),
        );
      }

      toast.success('복약 일정이 등록되었습니다.');

      setManualItems([]);
      setOcrResults([]);
      setOcrStep('idle');
      setSelectedFileName('');

      navigate('/app/schedule');
    } catch (error) {
      console.error('복약 일정 등록 실패:', error);
      toast.error(
        '복약 일정 등록에 실패했습니다. 콘솔과 네트워크 탭을 확인해주세요.',
      );
    }
  };

  const renderMedicationCard = (
    item: MedicationPreview,
    onRemove?: (id: number) => void,
    onEdit?: (item: MedicationPreview) => void,
  ) => {
    return (
      <div
        key={item.id}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-900">{item.medicineName}</p>

              <Badge variant="blue">{item.timesPerDay}회/일</Badge>

              <Badge variant="gray">{commonForm.durationDays}일분</Badge>
            </div>

            {item.medicineId && (
              <p className="mt-1 text-xs text-slate-400">
                약 DB ID: {item.medicineId}
              </p>
            )}

            <p className="mt-2 text-sm text-slate-500">
              1회 {item.dosageAmount}
              {item.dosageUnit} · 하루 {item.timesPerDay}회
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {item.doseTimes.map((doseTime, index) => (
                <span
                  key={`${doseTime.takeTime}-${index}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {doseTime.label} {doseTime.takeTime} · {doseTime.timing}
                </span>
              ))}
            </div>

            {item.cautionMessage && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {item.cautionMessage}
              </div>
            )}
          </div>

          {(onEdit || onRemove) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={() => onEdit(item)}
                >
                  수정
                </Button>
              )}

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

        <h1 className="mt-2 text-3xl font-bold text-slate-900">복약 등록</h1>

        <p className="mt-2 text-slate-500">
          복용할 약을 직접 입력하거나 처방전/약봉투 이미지를 업로드해 복약
          일정을 등록합니다.
        </p>
      </div>

      <Card className="p-0">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={[
              'flex-1 px-5 py-4 text-sm font-semibold transition',
              activeMode === 'manual'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            수동 입력
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('ocr')}
            className={[
              'flex-1 px-5 py-4 text-sm font-semibold transition',
              activeMode === 'ocr'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            처방전 업로드
          </button>
        </div>

        <div className="p-6">
          {activeMode === 'manual' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">수동 입력</h2>

                <p className="mt-1 text-sm text-slate-500">
                  약 이름, 복용량, 복용 횟수와 기간을 직접 입력합니다.
                </p>
              </div>

              <Card>
                <h3 className="text-lg font-bold text-slate-900">
                  처방 공통 정보
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  병원명, 약국명, 복용 시작일과 복용 기간은 이번 등록 묶음에
                  공통으로 적용됩니다.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input
                    label="병원명"
                    placeholder="예: 나무병원"
                    value={commonForm.hospitalName}
                    onChange={(event) =>
                      handleChangeCommonForm('hospitalName', event.target.value)
                    }
                  />

                  <Input
                    label="약국명"
                    placeholder="예: 꽃약국"
                    value={commonForm.pharmacyName}
                    onChange={(event) =>
                      handleChangeCommonForm('pharmacyName', event.target.value)
                    }
                  />

                  <Input
                    label="복용 시작일"
                    type="date"
                    value={commonForm.startDate}
                    onChange={(event) =>
                      handleChangeCommonForm('startDate', event.target.value)
                    }
                  />

                  <Input
                    label="복용 기간"
                    placeholder="예: 3"
                    value={commonForm.durationDays}
                    onChange={(event) =>
                      handleChangeCommonForm('durationDays', event.target.value)
                    }
                  />
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Input
                    label="약 이름"
                    placeholder="예: 타이레놀정 500mg"
                    value={manualForm.medicineName}
                    onChange={(event) => {
                      handleChangeManualForm(
                        'medicineName',
                        event.target.value,
                      );
                      setSelectedManualMedicine(null);
                      setIsMedicineSearchOpen(true);
                    }}
                    onFocus={() => setIsMedicineSearchOpen(true)}
                  />

                  {manualForm.medicineName.trim().length > 0 &&
                    manualForm.medicineName.trim().length < 2 && (
                      <p className="mt-2 text-xs text-slate-500">
                        두 글자 이상 입력하면 약 검색이 시작됩니다.
                      </p>
                    )}

                  {isMedicineSearchOpen &&
                    manualForm.medicineName.trim().length >= 2 && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                        <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                          약 검색 결과
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {isMedicineSearchLoading && (
                            <div className="px-3 py-4 text-sm text-slate-500">
                              약 정보를 검색하고 있습니다.
                            </div>
                          )}

                          {!isMedicineSearchLoading &&
                            medicineSearchResults.map((medicine) => (
                              <button
                                key={`${getMedicineId(medicine)}-${getMedicineName(medicine)}`}
                                type="button"
                                onClick={() => {
                                  setSelectedManualMedicine(medicine);
                                  handleChangeManualForm(
                                    'medicineName',
                                    getMedicineName(medicine),
                                  );
                                  setIsMedicineSearchOpen(false);
                                }}
                                className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                              >
                                <p className="font-semibold text-slate-900">
                                  {getMedicineName(medicine)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {getCompanyName(medicine)}
                                </p>
                              </button>
                            ))}

                          {!isMedicineSearchLoading &&
                            medicineSearchResults.length === 0 && (
                              <div className="px-3 py-4 text-sm text-slate-500">
                                검색 결과가 없습니다. 직접 입력한 이름으로
                                등록할 수 있습니다.
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                  {selectedManualMedicine && (
                    <p className="mt-2 text-sm font-medium text-blue-600">
                      선택됨: {getMedicineName(selectedManualMedicine)}
                    </p>
                  )}
                </div>

                <Input
                  label="1회 복용량"
                  placeholder="예: 1"
                  value={manualForm.dosageAmount}
                  onChange={(event) =>
                    handleChangeManualForm('dosageAmount', event.target.value)
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
                        'dosageUnit',
                        event.target.value as DosageUnit,
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

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    하루 복용 횟수
                  </p>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((count) => {
                      const isSelected =
                        manualForm.timesPerDay === String(count);

                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() =>
                            handleChangeManualTimesPerDay(String(count))
                          }
                          className={[
                            'rounded-xl border px-4 py-3 text-sm font-semibold transition',
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {count}회
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-bold text-slate-900">회차별 복용 시간</h4>

                <p className="mt-1 text-sm text-slate-500">
                  하루 복용 횟수에 따라 기본 시간이 자동 설정됩니다.
                </p>

                <div className="mt-4 space-y-3">
                  {manualForm.doseTimes.map((doseTime, index) => (
                    <div
                      key={`${doseTime.label}-${index}`}
                      className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[100px_1fr_1fr]"
                    >
                      <div className="flex items-center text-sm font-semibold text-slate-700">
                        {index + 1}회차 · {doseTime.label}
                      </div>

                      <Input
                        type="time"
                        value={doseTime.takeTime}
                        onChange={(event) =>
                          handleChangeDoseTime(
                            index,
                            'takeTime',
                            event.target.value,
                          )
                        }
                      />

                      <select
                        value={doseTime.timing}
                        onChange={(event) =>
                          handleChangeDoseTime(
                            index,
                            'timing',
                            event.target.value,
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
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleAddManualMedication}>
                  {editingManualItemId !== null
                    ? '복약 정보 수정 완료'
                    : '복약 정보 추가'}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    등록 예정 목록
                  </h3>

                  <Badge variant="blue">{manualItems.length}건</Badge>
                </div>

                {manualItems.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    아직 추가된 복약 정보가 없습니다.
                  </div>
                ) : (
                  manualItems.map((item) =>
                    renderMedicationCard(
                      item,
                      handleRemoveManualMedication,
                      handleStartEditManualMedication,
                    ),
                  )
                )}
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                수동 입력 정보는 복약 일정과 복약 시간으로 저장됩니다. 복용
                시간은 하루 복용 횟수에 따라 기본 시간으로 자동 생성됩니다.
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => handleRegisterSchedule(manualItems)}
                  disabled={isRegistering}
                >
                  {isRegistering ? '등록 중...' : '복약 일정 등록'}
                </Button>
              </div>
            </div>
          )}

          {activeMode === 'ocr' && (
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
                        setOcrStep('idle');
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

              {ocrStep === 'analyzing' && (
                <Card className="bg-blue-50">
                  <p className="font-bold text-blue-700">OCR 분석 중입니다.</p>

                  <p className="mt-2 text-sm text-blue-700">
                    이미지에서 약 이름, 복용량, 복용 횟수와 복용 기간을 추출하고
                    있습니다.
                  </p>
                </Card>
              )}

              {ocrStep === 'completed' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      OCR 분석 결과
                    </h3>

                    <Badge variant="green">{ocrResults.length}건 추출</Badge>
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
                      disabled={isRegistering}
                    >
                      {isRegistering
                        ? '등록 중...'
                        : '분석 결과로 복약 일정 등록'}
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
