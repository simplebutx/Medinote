import axios from 'axios';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Input } from '../../components/ui';
import { useUpdatePassword } from '../../features/auth/hooks';
import {
  useCautionSuggest,
  useCreateMyCaution,
  useDeleteMyCaution,
  useDiseaseSuggest,
  useMyCautions,
  useMyProfile,
  useUpdateMyCaution,
  useUpdateMyProfile,
  useWithdrawAccount,
} from '../../features/user/hooks';
import type {
  CautionItem,
  CautionReason,
  CautionRequest,
  CautionTargetType,
} from '../../features/user/types/caution.types';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useCreateMedicationScheduleTime,
  useDeleteMedicationSchedule,
  useDeleteMedicationScheduleTime,
  usePaginatedMedicationSchedules,
  useMedicationTimePresets,
  usePrescriptionAnalysis,
  useUpdateMedicationSchedule,
  useUpdateMedicationTimePresets,
} from '../../features/schedule/hooks';
import { getMedicationScheduleTimes } from '../../features/schedule/api/schedule.api';
import type {
  DosageUnit,
  MedicationSchedule,
  MedicationScheduleMedicine,
  MedicationScheduleTime,
  MedicationTiming,
  MedicationTimePreset,
  PrescriptionAnalysisResponse,
  PrescriptionAnalysisResultItem,
} from '../../features/schedule/types/schedule.types';
import { getSmartPillSlotAssignments } from '../../features/smartpill/api/smartpill.api';
import {
  useSaveSmartPillSlotAssignments,
  useSmartPillDevices,
} from '../../features/smartpill/hooks';
import type { SmartPillSlotAssignmentResponse } from '../../features/smartpill/types/smartpill.types';

type MyPageTab = 'profile' | 'health' | 'caution' | 'timePreset' | 'prescription';

const SMARTPILL_SLOT_NUMBERS = [1, 2, 3, 4] as const;
const DEFAULT_SMARTPILL_DEVICE_ID = 'smartpill-prototype-1';

const reasonOptions: { label: string; value: CautionReason }[] = [
  { label: '알레르기', value: 'ALLERGY' },
  { label: '부작용', value: 'SIDE_EFFECT' },
  { label: '의사 권고', value: 'DOCTOR_ADVICE' },
  { label: '약사 권고', value: 'PHARMACIST_ADVICE' },
  { label: '개인 회피', value: 'PERSONAL_AVOID' },
  { label: '기타', value: 'OTHER' },
];

function getCautionSourceLabel(sourceType: CautionTargetType) {
  return sourceType === 'MEDICINE' ? '약' : '성분';
}

function getPasswordValidationMessage(value: string) {
  if (!value) {
    return '새 비밀번호를 입력해주세요.';
  }

  const hasAlphabet = /[A-Za-z]/.test(value);
  const hasSpecialCharacter =
    /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(value);
  const hasValidLength = value.length >= 8 && value.length <= 20;
  const hasNoWhitespace = !/\s/.test(value);

  if (
    !hasValidLength ||
    !hasAlphabet ||
    !hasSpecialCharacter ||
    !hasNoWhitespace
  ) {
    return '비밀번호는 8자 이상 20자 이하이며 영문과 특수문자를 포함해야 합니다.';
  }

  return '';
}

interface DiseaseOption {
  code: string;
  name: string;
}

function normalizeDiseaseName(value: string) {
  return value.trim().replace(/^@/, '');
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

interface HealthFormState {
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isSmoking: boolean;
  isDrinking: boolean;
  isChild: boolean;
  isElderly: boolean;
  diseases: DiseaseOption[];
}

interface PrescriptionEditDoseTimeForm {
  takeTime: string;
  timing: MedicationTiming;
}

interface PrescriptionEditMedicineForm {
  id: string;
  medicineId?: number | null;
  customMedicineName: string;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  timesPerDay: string;
  durationDays: string;
  doseTimes: PrescriptionEditDoseTimeForm[];
}

interface PrescriptionEditForm {
  hospitalName: string;
  pharmacyName: string;
  startDate: string;
  durationDays: string;
  medicines: PrescriptionEditMedicineForm[];
}

interface SmartPillTimeGroup {
  key: string;
  takeTime: string;
  scheduleTimeIds: number[];
  medicineNames: string[];
}

type SmartPillAssignments = Record<number, string>;

function buildSmartPillTimeGroups(
  schedule: MedicationSchedule,
  scheduleTimes: MedicationScheduleTime[],
) {
  const medicinesById = new Map(
    getScheduleMedicines(schedule).map((medicine) => [medicine.id, medicine]),
  );

  const groups = new Map<string, SmartPillTimeGroup>();

  scheduleTimes.forEach((scheduleTime) => {
    const takeTime = scheduleTime.takeTime.slice(0, 5);

    if (!scheduleTime.id || !takeTime) {
      return;
    }

    const medicine = scheduleTime.medicationScheduleMedicineId
      ? medicinesById.get(scheduleTime.medicationScheduleMedicineId)
      : null;

    const current = groups.get(takeTime) ?? {
      key: takeTime,
      takeTime,
      scheduleTimeIds: [],
      medicineNames: [],
    };

    current.scheduleTimeIds.push(scheduleTime.id);
    current.medicineNames.push(
      medicine ? getMedicineDisplayName(medicine) : `등록 약 #${scheduleTime.id}`,
    );
    groups.set(takeTime, current);
  });

  return Array.from(groups.values()).sort((left, right) =>
    left.takeTime.localeCompare(right.takeTime),
  );
}

function createDefaultSmartPillAssignments(
  timeGroups: SmartPillTimeGroup[],
): SmartPillAssignments {
  return Object.fromEntries(
    SMARTPILL_SLOT_NUMBERS.map((slotNumber, index) => [
      slotNumber,
      timeGroups[index]?.key ?? '',
    ]),
  );
}

function createSmartPillAssignmentsFromResponse(
  response: SmartPillSlotAssignmentResponse,
  timeGroups: SmartPillTimeGroup[],
) {
  const nextAssignments = createDefaultSmartPillAssignments([]);

  (response.slots ?? []).forEach((slot) => {
    const assignedIds = new Set(
      (slot.scheduleTimes ?? []).map(
        (scheduleTime) => scheduleTime.medicationScheduleTimeId,
      ),
    );

    const matchedGroup = timeGroups.find((group) => {
      return (
        group.scheduleTimeIds.length === assignedIds.size &&
        group.scheduleTimeIds.every((id) => assignedIds.has(id))
      );
    });

    if (matchedGroup) {
      nextAssignments[slot.slotNumber] = matchedGroup.key;
    }
  });

  return nextAssignments;
}

function getPrescriptionDurationDays(schedule: MedicationSchedule) {
  const medicines = getScheduleMedicines(schedule);

  const medicineDuration = medicines.find(
    (medicine) => medicine.durationDays != null,
  )?.durationDays;

  return medicineDuration ?? schedule.durationDays ?? 1;
}

function getReasonLabel(reason: CautionReason) {
  return (
    reasonOptions.find((option) => option.value === reason)?.label ?? '기타'
  );
}

function getReasonBadge(reason: CautionReason) {
  if (reason === 'ALLERGY') return 'red';
  if (reason === 'SIDE_EFFECT') return 'yellow';
  if (reason === 'DOCTOR_ADVICE' || reason === 'PHARMACIST_ADVICE') {
    return 'blue';
  }
  return 'gray';
}

function getScheduleMedicines(
  schedule: MedicationSchedule,
): MedicationScheduleMedicine[] {
  return schedule.medicines ?? schedule.medicationScheduleMedicines ?? [];
}

function getPrescriptionTitle(schedule: MedicationSchedule) {
  if (schedule.hospitalName) {
    return `${schedule.hospitalName} 처방`;
  }

  if (schedule.pharmacyName) {
    return `${schedule.pharmacyName} 조제`;
  }

  return `처방 내역 #${schedule.id}`;
}

function getPrescriptionDate(schedule: MedicationSchedule) {
  return (
    schedule.prescribedDate ||
    schedule.dispensedDate ||
    schedule.startDate ||
    '날짜 없음'
  );
}

function getPrescriptionStatus(schedule: MedicationSchedule) {
  return schedule.isActive ? '복용 중' : '종료';
}

function getPrescriptionRange(schedule: MedicationSchedule) {
  const medicines = getScheduleMedicines(schedule);

  if (medicines.length === 0) {
    return {
      startDate: schedule.startDate ?? '-',
      endDate: schedule.endDate ?? '-',
    };
  }

  const startDates = medicines
    .map((medicine) => medicine.startDate)
    .filter((value): value is string => Boolean(value))
    .sort();

  const endDates = medicines
    .map((medicine) => medicine.endDate)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    startDate: startDates[0] ?? schedule.startDate ?? '-',
    endDate: endDates[endDates.length - 1] ?? schedule.endDate ?? '-',
  };
}

function getMedicineDisplayName(medicine: MedicationScheduleMedicine) {
  return (
    medicine.customMedicineName ||
    `등록 약 #${medicine.medicineId ?? medicine.id}`
  );
}

function getDosageUnitLabel(unit?: string | null) {
  if (unit === 'TABLET') return '정';
  if (unit === 'CAPSULE') return '캡슐';
  if (unit === 'PACK') return '포';
  if (unit === 'ML') return 'ml';
  if (unit === 'MG') return 'mg';
  if (unit === 'DROP') return '방울';

  return unit ?? '';
}

function getDosageText(medicine: MedicationScheduleMedicine) {
  const amount = medicine.dosageAmount ?? '-';
  const unit = getDosageUnitLabel(medicine.dosageUnit);

  return `1회 ${amount}${unit} · 하루 ${medicine.timesPerDay ?? '-'}회 · ${
    medicine.durationDays ?? '-'
  }일`;
}

function getPrescriptionAnalysisStatusLabel(
  analysis: PrescriptionAnalysisResponse,
) {
  return analysis.status === 'CAUTION' ? '주의 필요' : '특이사항 없음';
}

function getPrescriptionAnalysisStatusBadgeVariant(
  analysis: PrescriptionAnalysisResponse,
): 'yellow' | 'green' {
  return analysis.status === 'CAUTION' ? 'yellow' : 'green';
}

function getPrescriptionAnalysisSummary(
  analysis: PrescriptionAnalysisResponse,
) {
  if (analysis.status === 'CAUTION') {
    return '등록된 주의 정보와 처방 약 사이에 확인이 필요한 항목이 있습니다.';
  }

  return '현재 등록된 주의 정보와 겹치는 항목은 발견되지 않았습니다.';
}

function getStringList(values?: string[] | null) {
  return (values ?? []).filter(Boolean);
}

function getPrescriptionAnalysisItems(analysis: PrescriptionAnalysisResponse) {
  return analysis.items ?? [];
}

function getAnalysisMedicineName(
  item: PrescriptionAnalysisResultItem,
  index: number,
) {
  return item.medicineName?.trim() || `약 ${index + 1}`;
}

function getAnalysisWarnings(item: PrescriptionAnalysisResultItem) {
  const warnings: string[] = [];

  if (item.warningMedicine) warnings.push('주의 약');
  if (item.warningIngredient) warnings.push('주의 성분');
  if (item.warningDisease) warnings.push('기저질환');
  if (item.warningHealthInfo) warnings.push('건강 상태');

  return warnings;
}

function getPersonalCautionLines(item: PrescriptionAnalysisResultItem) {
  return [
    ...getStringList(item.matchedMedicineCautions).map(
      (value) => `주의 약: ${value}`,
    ),
    ...getStringList(item.matchedIngredientCautions).map(
      (value) => `주의 성분: ${value}`,
    ),
    ...getStringList(item.matchedDiseaseNames).map(
      (value) => `기저질환: ${value}`,
    ),
    ...getStringList(item.matchedHealthInfoNames).map(
      (value) => `건강 상태: ${value}`,
    ),
  ].filter(Boolean);
}

function getAnalysisGeneralCautionTags(item: PrescriptionAnalysisResultItem) {
  return getStringList(item.generalCautionTags);
}

function getPrescriptionGeneralCautionTags(
  analysis: PrescriptionAnalysisResponse,
) {
  const seen = new Set<string>();

  return getPrescriptionAnalysisItems(analysis)
    .flatMap(getAnalysisGeneralCautionTags)
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}

const dosageUnitOptions: { label: string; value: DosageUnit }[] = [
  { label: '정', value: 'TABLET' },
  { label: '캡슐', value: 'CAPSULE' },
  { label: '포', value: 'PACK' },
  { label: 'ml', value: 'ML' },
  { label: 'mg', value: 'MG' },
  { label: '방울', value: 'DROP' },
  { label: '기타', value: 'OTHER' },
];

const medicationTimingOptions: { label: string; value: MedicationTiming }[] = [
  { label: '식후', value: 'AFTER_MEAL' },
  { label: '식전', value: 'BEFORE_MEAL' },
  { label: '식사 중', value: 'WITH_MEAL' },
  { label: '공복', value: 'EMPTY_STOMACH' },
  { label: '취침 전', value: 'BEDTIME' },
  { label: '상관없음', value: 'ANYTIME' },
];

function getDefaultEditDoseTimes(
  timesPerDay: number,
): PrescriptionEditDoseTimeForm[] {
  if (timesPerDay <= 1) {
    return [{ takeTime: '08:00', timing: 'AFTER_MEAL' }];
  }

  if (timesPerDay === 2) {
    return [
      { takeTime: '08:00', timing: 'AFTER_MEAL' },
      { takeTime: '18:00', timing: 'AFTER_MEAL' },
    ];
  }

  if (timesPerDay === 3) {
    return [
      { takeTime: '08:00', timing: 'AFTER_MEAL' },
      { takeTime: '12:00', timing: 'AFTER_MEAL' },
      { takeTime: '18:00', timing: 'AFTER_MEAL' },
    ];
  }

  return [
    { takeTime: '08:00', timing: 'AFTER_MEAL' },
    { takeTime: '12:00', timing: 'AFTER_MEAL' },
    { takeTime: '18:00', timing: 'AFTER_MEAL' },
    { takeTime: '23:00', timing: 'BEDTIME' },
  ];
}

function createEmptyPrescriptionEditMedicine(): PrescriptionEditMedicineForm {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    medicineId: null,
    customMedicineName: '',
    dosageAmount: '1',
    dosageUnit: 'TABLET',
    timesPerDay: '3',
    durationDays: '3',
    doseTimes: getDefaultEditDoseTimes(3),
  };
}

function createEmptyPrescriptionEditForm(): PrescriptionEditForm {
  return {
    hospitalName: '',
    pharmacyName: '',
    startDate: '',
    durationDays: '1',
    medicines: [createEmptyPrescriptionEditMedicine()],
  };
}

function createDefaultMedicationTimePresets(): MedicationTimePreset[] {
  return [
    {
      timesPerDay: 1,
      slots: [{ sortOrder: 1, takeTime: '08:00' }],
    },
    {
      timesPerDay: 2,
      slots: [
        { sortOrder: 1, takeTime: '08:00' },
        { sortOrder: 2, takeTime: '18:00' },
      ],
    },
    {
      timesPerDay: 3,
      slots: [
        { sortOrder: 1, takeTime: '08:00' },
        { sortOrder: 2, takeTime: '12:00' },
        { sortOrder: 3, takeTime: '18:00' },
      ],
    },
    {
      timesPerDay: 4,
      slots: [
        { sortOrder: 1, takeTime: '08:00' },
        { sortOrder: 2, takeTime: '12:00' },
        { sortOrder: 3, takeTime: '18:00' },
        { sortOrder: 4, takeTime: '23:00' },
      ],
    },
  ];
}

function normalizeMedicationTimePresets(
  presets: MedicationTimePreset[],
): MedicationTimePreset[] {
  const defaults = createDefaultMedicationTimePresets();

  return defaults.map((defaultPreset) => {
    const matchedPreset = presets.find(
      (preset) => preset.timesPerDay === defaultPreset.timesPerDay,
    );

    if (!matchedPreset) {
      return defaultPreset;
    }

    return {
      timesPerDay: defaultPreset.timesPerDay,
      slots: defaultPreset.slots.map((defaultSlot) => {
        const matchedSlot = matchedPreset.slots.find(
          (slot) => slot.sortOrder === defaultSlot.sortOrder,
        );

        return {
          sortOrder: defaultSlot.sortOrder,
          takeTime: (matchedSlot?.takeTime || defaultSlot.takeTime).slice(0, 5),
        };
      }),
    };
  });
}

const tabs: { label: string; value: MyPageTab }[] = [
  { label: '기본 정보', value: 'profile' },
  { label: '건강 정보', value: 'health' },
  { label: '알레르기/주의 성분', value: 'caution' },
  { label: '복약 시간 설정', value: 'timePreset' },
  { label: '처방 내역', value: 'prescription' },
];

const infoTileClass =
  'rounded-xl border border-slate-200 bg-slate-50/70 p-4';

const softSectionClass =
  'rounded-2xl border border-slate-200 bg-slate-50/70 p-4';

const noticeClass =
  'rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-700';

const choiceBaseClass =
  'rounded-xl border px-4 py-4 text-left text-sm font-semibold transition';

const choiceSelectedClass =
  'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10';

const choiceDefaultClass =
  'border-slate-200 bg-white text-slate-600';

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const modalOverlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm';

const modalPanelClass =
  'w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/10';

function MyPage() {
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');

  const {
    data: myProfile,
    isLoading: isMyProfileLoading,
    isError: isMyProfileError,
  } = useMyProfile();

  const updateMyProfileMutation = useUpdateMyProfile();
  const updatePasswordMutation = useUpdatePassword();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [hasTriedPasswordChange, setHasTriedPasswordChange] = useState(false);

  // 처방 내역 페이지 상태
  const [prescriptionPage, setPrescriptionPage] = useState(0);
  const PRESCRIPTION_PAGE_SIZE = 5;

  const {
    data: paginatedSchedules,
    isLoading: isMedicationScheduleLoading,
    isError: isMedicationScheduleError,
    refetch: refetchMedicationSchedules,
  } = usePaginatedMedicationSchedules(prescriptionPage, PRESCRIPTION_PAGE_SIZE);

  const medicationSchedules = paginatedSchedules?.content ?? [];
  const prescriptionTotalPages = paginatedSchedules?.totalPages ?? 1;

  // 처방전 탭 활성화 시 첫 페이지부터 재조회
  useEffect(() => {
    if (activeTab === 'prescription') {
      setPrescriptionPage(0);
      refetchMedicationSchedules();
    }
  }, [activeTab]);


  const {
    data: medicationTimePresets = [],
    isLoading: isMedicationTimePresetLoading,
    isError: isMedicationTimePresetError,
  } = useMedicationTimePresets();

  const updateMedicationTimePresetsMutation = useUpdateMedicationTimePresets();

    const navigate = useNavigate();
    const withdrawAccountMutation = useWithdrawAccount();

    const handleWithdrawAccount = () => {
      const confirmed = window.confirm(
        '정말로 회원 탈퇴하시겠습니까? 탈퇴 후 계정 정보는 복구할 수 없습니다.',
      );

      if (!confirmed) return;

      withdrawAccountMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('회원 탈퇴가 완료되었습니다.');
          navigate('/login', { replace: true });
        },
        onError: (error) => {
          console.error('회원 탈퇴 실패:', error);
          toast.error('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
        },
      });
    };

  const normalizedMedicationTimePresets = useMemo(
    () => normalizeMedicationTimePresets(medicationTimePresets),
    [medicationTimePresets],
  );

  const [medicationTimePresetDraft, setMedicationTimePresetDraft] = useState<
    MedicationTimePreset[] | null
  >(null);

  const medicationTimePresetForm =
    medicationTimePresetDraft ?? normalizedMedicationTimePresets;

  const updateMedicationScheduleMutation = useUpdateMedicationSchedule();
  const deleteMedicationScheduleMutation = useDeleteMedicationSchedule();
  const deleteMedicationScheduleTimeMutation = useDeleteMedicationScheduleTime();
  const createScheduleTimeMutation = useCreateMedicationScheduleTime();
  const prescriptionAnalysisMutation = usePrescriptionAnalysis();
  const [prescriptionAnalysisByScheduleId, setPrescriptionAnalysisByScheduleId] =
    useState<Record<number, PrescriptionAnalysisResponse>>({});
  const [analyzingPrescriptionId, setAnalyzingPrescriptionId] = useState<
    number | null
  >(null);
  const { data: smartPillDevices = [] } = useSmartPillDevices();
  const saveSmartPillAssignmentsMutation =
    useSaveSmartPillSlotAssignments();

  const [editingPrescriptionId, setEditingPrescriptionId] = useState<
    number | null
  >(null);

  const [editingPrescriptionMedicineId, setEditingPrescriptionMedicineId] =
    useState<string | null>(null);

  const [isPrescriptionEditLoading, setIsPrescriptionEditLoading] =
    useState(false);

  const [prescriptionEditForm, setPrescriptionEditForm] =
    useState<PrescriptionEditForm>(createEmptyPrescriptionEditForm());

  const [smartPillModalSchedule, setSmartPillModalSchedule] =
    useState<MedicationSchedule | null>(null);
  const [smartPillDeviceId, setSmartPillDeviceId] = useState(
    DEFAULT_SMARTPILL_DEVICE_ID,
  );
  const [smartPillTimeGroups, setSmartPillTimeGroups] = useState<
    SmartPillTimeGroup[]
  >([]);
  const [smartPillAssignments, setSmartPillAssignments] =
    useState<SmartPillAssignments>(() =>
      createDefaultSmartPillAssignments([]),
    );
  const [isSmartPillAssignmentLoading, setIsSmartPillAssignmentLoading] =
    useState(false);

  const {
    data: cautionList = [],
    isLoading: isCautionLoading,
    isError: isCautionError,
  } = useMyCautions();

  const createCautionMutation = useCreateMyCaution();
  const deleteCautionMutation = useDeleteMyCaution();
  const updateCautionMutation = useUpdateMyCaution();

  const [healthDiseaseKeyword, setHealthDiseaseKeyword] = useState('');

  const debouncedHealthDiseaseKeyword = useDebounce(healthDiseaseKeyword, 300);
  const diseaseSearchKeyword = debouncedHealthDiseaseKeyword.trim();

  const {
    data: diseaseSuggestions = [],
    isLoading: isDiseaseSuggestLoading,
  } = useDiseaseSuggest(diseaseSearchKeyword);

  const [isHealthDiseaseSearchOpen, setIsHealthDiseaseSearchOpen] =
    useState(false);

  const [isHealthEditing, setIsHealthEditing] = useState(false);
  const [healthDraft, setHealthDraft] = useState<HealthFormState | null>(null);

  const profileHealthForm = useMemo<HealthFormState>(() => {
    const profileDiseases = myProfile?.chronicDiseases ?? myProfile?.diseases ?? [];

    return {
      isPregnant: Boolean(myProfile?.isPregnant ?? myProfile?.is_pregnant),
      isBreastfeeding: Boolean(
        myProfile?.isBreastfeeding ?? myProfile?.is_breastfeeding,
      ),
      isSmoking: Boolean(myProfile?.isSmoking ?? myProfile?.is_smoking),
      isDrinking: Boolean(myProfile?.isDrinking ?? myProfile?.is_drinking),
      isChild: Boolean(myProfile?.isChild ?? myProfile?.is_child),
      isElderly: Boolean(myProfile?.isElderly ?? myProfile?.is_elderly),
      diseases: profileDiseases
        .map((disease) => {
          if (typeof disease === 'string') {
            return {
              code: disease,
              name: disease,
            };
          }

          const code = disease.diseaseCode ?? disease.disease_code ?? '';
          const name =
            disease.diseaseName ?? disease.disease_name ?? disease.name ?? '';

          if (!name) {
            return null;
          }

          return {
            code: code || name,
            name,
          };
        })
        .filter((disease): disease is DiseaseOption => disease !== null),
    };
  }, [myProfile]);

  const healthForm = healthDraft ?? profileHealthForm;

  const updateHealthForm = (
    updater: (current: HealthFormState) => HealthFormState,
  ) => {
    if (!isHealthEditing) {
      return;
    }

    setHealthDraft((prev) => updater(prev ?? profileHealthForm));
  };

  const [editingCautionId, setEditingCautionId] = useState<number | null>(null);
  const [isCautionFormOpen, setIsCautionFormOpen] = useState(false);
  const [cautionSourceType, setCautionSourceType] =
    useState<CautionTargetType>('MEDICINE');

  const [cautionKeyword, setCautionKeyword] = useState('');
  const [isCautionSearchOpen, setIsCautionSearchOpen] = useState(false);
  const [selectedCautionTarget, setSelectedCautionTarget] = useState<{
    name: string;
    type: CautionTargetType;
  } | null>(null);

  const [reason, setReason] = useState<CautionReason>('ALLERGY');
  const [memo, setMemo] = useState('');

  const debouncedCautionKeyword = useDebounce(cautionKeyword, 300);

  const { data: cautionSuggestions = [], isLoading: isCautionSuggestLoading } =
    useCautionSuggest(debouncedCautionKeyword, cautionSourceType);

  const profileInfo = {
    name: myProfile?.username || myProfile?.name || '사용자',
    email: myProfile?.email || '이메일 정보 없음',
    birthDate:
      myProfile?.birthDate || myProfile?.birth_date || '등록된 생년월일 없음',
    gender:
      myProfile?.gender === 'MALE'
        ? '남성'
        : myProfile?.gender === 'FEMALE'
          ? '여성'
          : '등록된 성별 없음',
    role: myProfile?.role || 'USER',
  };

  const filteredHealthDiseases = useMemo(() => {
    return diseaseSuggestions.map((diseaseName) => ({
      code: diseaseName,
      name: diseaseName,
    }));
  }, [diseaseSuggestions]);

  const handleChangeHealthDiseaseKeyword = (value: string) => {
    setHealthDiseaseKeyword(value);
    setIsHealthDiseaseSearchOpen(value.trim().length >= 2);
  };

  const handleAddHealthDisease = (rawDiseaseName: string) => {
    const diseaseName = normalizeDiseaseName(rawDiseaseName);

    if (!diseaseName) {
      return;
    }

    updateHealthForm((current) => {
      const alreadySelected = current.diseases.some(
        (item) =>
          item.name.toLocaleLowerCase() === diseaseName.toLocaleLowerCase(),
      );

      if (alreadySelected) {
        return current;
      }

      return {
        ...current,
        diseases: [
          ...current.diseases,
          {
            code: diseaseName,
            name: diseaseName,
          },
        ],
      };
    });

    setHealthDiseaseKeyword('');
    setIsHealthDiseaseSearchOpen(false);
  };

  const handleSelectHealthDisease = (disease: DiseaseOption) => {
    handleAddHealthDisease(disease.name);
  };

  const handleRemoveHealthDisease = (diseaseCode: string) => {
    updateHealthForm((current) => ({
      ...current,
      diseases: current.diseases.filter(
        (disease) => disease.code !== diseaseCode,
      ),
    }));
  };

  const handleStartEditHealthInfo = () => {
    setHealthDraft({
      ...profileHealthForm,
      diseases: [...profileHealthForm.diseases],
    });
    setIsHealthEditing(true);
  };

  const handleCancelEditHealthInfo = () => {
    setHealthDraft(null);
    setHealthDiseaseKeyword('');
    setIsHealthDiseaseSearchOpen(false);
    setIsHealthEditing(false);
  };

  const handleSaveHealthInfo = () => {
    const diseaseNames = getUniqueDiseaseNames([
      ...healthForm.diseases.map((disease) => disease.name),
      healthDiseaseKeyword,
    ]);

    updateMyProfileMutation.mutate(
      {
        username: profileInfo.name,
        birthDate: myProfile?.birthDate || myProfile?.birth_date || undefined,
        gender:
          myProfile?.gender === 'MALE' || myProfile?.gender === 'FEMALE'
            ? myProfile.gender
            : undefined,
        isPregnant: healthForm.isPregnant,
        isBreastfeeding: healthForm.isBreastfeeding,
        isSmoking: healthForm.isSmoking,
        isDrinking: healthForm.isDrinking,
        isChild: healthForm.isChild,
        isElderly: healthForm.isElderly,
        diseases: diseaseNames,
      },
      {
        onSuccess: () => {
          toast.success('건강 정보가 저장되었습니다.');
          setHealthDraft(null);
          setHealthDiseaseKeyword('');
          setIsHealthDiseaseSearchOpen(false);
          setIsHealthEditing(false);
        },
        onError: (error) => {
          console.error('건강 정보 저장 실패:', error);
          toast.error('건강 정보 저장에 실패했습니다.');
        },
      },
    );
  };

  const handleChangeMedicationTimePreset = (
    timesPerDay: number,
    sortOrder: number,
    takeTime: string,
  ) => {
    setMedicationTimePresetDraft((prev) => {
      const currentPresets = prev ?? normalizedMedicationTimePresets;

      return currentPresets.map((preset) => {
        if (preset.timesPerDay !== timesPerDay) {
          return preset;
        }

        return {
          ...preset,
          slots: preset.slots.map((slot) =>
            slot.sortOrder === sortOrder
              ? {
                  ...slot,
                  takeTime,
                }
              : slot,
          ),
        };
      });
    });
  };

  const handleResetMedicationTimePresets = () => {
    setMedicationTimePresetDraft(createDefaultMedicationTimePresets());
  };

  const handleSaveMedicationTimePresets = () => {
    updateMedicationTimePresetsMutation.mutate(
      {
        presets: medicationTimePresetForm,
      },
      {
        onSuccess: () => {
          toast.success('복약 기본 시간이 저장되었습니다.');
          setMedicationTimePresetDraft(null);
        },
        onError: (error) => {
          console.error('복약 기본 시간 저장 실패:', error);
          toast.error('복약 기본 시간 저장에 실패했습니다.');
        },
      },
    );
  };

  const handleCancelEditPrescription = () => {
    setEditingPrescriptionId(null);
    setEditingPrescriptionMedicineId(null);
    setPrescriptionEditForm(createEmptyPrescriptionEditForm());
  };

  const handleStartEditPrescription = async (schedule: MedicationSchedule) => {
    setIsPrescriptionEditLoading(true);

    try {
      const range = getPrescriptionRange(schedule);
      const durationDays = getPrescriptionDurationDays(schedule);
      const scheduleTimes = await getMedicationScheduleTimes(schedule.id);

      const medicines = getScheduleMedicines(schedule).map((medicine) => {
        const matchedTimes = scheduleTimes
          .filter((time) => time.medicationScheduleMedicineId === medicine.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const timesPerDay = medicine.timesPerDay ?? matchedTimes.length ?? 1;

        return {
          id: String(medicine.id),
          medicineId: medicine.medicineId ?? null,
          customMedicineName: getMedicineDisplayName(medicine),
          dosageAmount: String(medicine.dosageAmount ?? 1),
          dosageUnit: medicine.dosageUnit ?? 'TABLET',
          timesPerDay: String(timesPerDay),
          durationDays: String(medicine.durationDays ?? durationDays),
          doseTimes:
            matchedTimes.length > 0
              ? matchedTimes.map((time) => ({
                  takeTime: time.takeTime.slice(0, 5),
                  timing: time.timing,
                }))
              : getDefaultEditDoseTimes(timesPerDay),
        };
      });

      setEditingPrescriptionId(schedule.id);
      setPrescriptionEditForm({
        hospitalName: schedule.hospitalName ?? '',
        pharmacyName: schedule.pharmacyName ?? '',
        startDate:
          range.startDate !== '-' ? range.startDate : schedule.startDate ?? '',
        durationDays: String(durationDays),
        medicines: medicines.length > 0 ? medicines : [createEmptyPrescriptionEditMedicine()],
      });

      setEditingPrescriptionMedicineId(null);

    } catch (error) {
      console.error('처방 내역 수정 정보 불러오기 실패:', error);
      toast.error('처방 내역 수정 정보를 불러오지 못했습니다.');
    } finally {
      setIsPrescriptionEditLoading(false);
    }
  };

  const handleChangePrescriptionCommonForm = (
    key: keyof Omit<PrescriptionEditForm, 'medicines'>,
    value: string,
  ) => {
    setPrescriptionEditForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChangePrescriptionMedicine = (
    medicineIndex: number,
    key:
      | 'customMedicineName'
      | 'dosageAmount'
      | 'dosageUnit'
      | 'timesPerDay'
      | 'durationDays',
    value: string | DosageUnit,
  ) => {
    setPrescriptionEditForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine;
        }

        if (key === 'timesPerDay') {
          const nextTimesPerDay = Number(value);

          return {
            ...medicine,
            timesPerDay: value,
            doseTimes: getDefaultEditDoseTimes(nextTimesPerDay),
          };
        }

        return {
          ...medicine,
          [key]: value,
        };
      }),
    }));
  };

  const handleChangePrescriptionDoseTime = (
    medicineIndex: number,
    doseTimeIndex: number,
    key: keyof PrescriptionEditDoseTimeForm,
    value: string,
  ) => {
    setPrescriptionEditForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine;
        }

        return {
          ...medicine,
          doseTimes: medicine.doseTimes.map((doseTime, timeIndex) =>
            timeIndex === doseTimeIndex
              ? {
                  ...doseTime,
                  [key]: value,
                }
              : doseTime,
          ),
        };
      }),
    }));
  };

  const handleAddPrescriptionMedicine = () => {
    const newMedicine = {
      ...createEmptyPrescriptionEditMedicine(),
      durationDays: prescriptionEditForm.durationDays || '1',
    };

    setPrescriptionEditForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, newMedicine],
    }));

    setEditingPrescriptionMedicineId(newMedicine.id);
  };

  const handleRemovePrescriptionMedicine = (medicineIndex: number) => {
    if (prescriptionEditForm.medicines.length <= 1) {
      toast.error('약은 최소 1개 이상 필요합니다.');
      return;
    }

    const removedMedicine = prescriptionEditForm.medicines[medicineIndex];

    if (editingPrescriptionMedicineId === removedMedicine?.id) {
      setEditingPrescriptionMedicineId(null);
    }

    setPrescriptionEditForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, index) => index !== medicineIndex),
    }));
  };

  const handleSavePrescription = async (schedule: MedicationSchedule) => {
    if (!prescriptionEditForm.startDate) {
      toast.error('복용 시작일을 입력해주세요.');
      return;
    }

    const durationDays = Number(prescriptionEditForm.durationDays);

    if (!durationDays || durationDays <= 0) {
      toast.error('복용 기간을 입력해주세요.');
      return;
    }

    if (prescriptionEditForm.medicines.length === 0) {
      toast.error('약을 최소 1개 이상 등록해주세요.');
      return;
    }

    for (const medicine of prescriptionEditForm.medicines) {
      if (!medicine.customMedicineName.trim()) {
        toast.error('약 이름을 입력해주세요.');
        return;
      }

      if (!Number(medicine.dosageAmount) || Number(medicine.dosageAmount) <= 0) {
        toast.error('1회 복용량을 입력해주세요.');
        return;
      }

      if (!Number(medicine.timesPerDay) || Number(medicine.timesPerDay) <= 0) {
        toast.error('하루 복용 횟수를 선택해주세요.');
        return;
      }
    }

    try {
      const updatedSchedule = await updateMedicationScheduleMutation.mutateAsync({
        id: schedule.id,
        body: {
          hospitalName: prescriptionEditForm.hospitalName.trim() || null,
          pharmacyName: prescriptionEditForm.pharmacyName.trim() || null,
          dispensedDate: prescriptionEditForm.startDate,
          startDate: prescriptionEditForm.startDate,
          durationDays,
          medicines: prescriptionEditForm.medicines.map((medicine) => ({
            medicineId: medicine.medicineId ?? null,
            customMedicineName: medicine.customMedicineName.trim(),
            dosageAmount: Number(medicine.dosageAmount),
            dosageUnit: medicine.dosageUnit,
            timesPerDay: Number(medicine.timesPerDay),
            durationDays: Number(medicine.durationDays) || durationDays,
          })),
        },
      });

      const updatedMedicines =
        updatedSchedule.medicines ??
        updatedSchedule.medicationScheduleMedicines ??
        [];

      if (updatedMedicines.length !== prescriptionEditForm.medicines.length) {
        throw new Error('수정된 약 개수가 입력 개수와 일치하지 않습니다.');
      }

      const existingTimes = await getMedicationScheduleTimes(schedule.id);

      for (const time of existingTimes) {
        await deleteMedicationScheduleTimeMutation.mutateAsync(time.id);
      }

      for (const [medicineIndex, medicine] of prescriptionEditForm.medicines.entries()) {
        const updatedMedicine = updatedMedicines[medicineIndex];

        if (!updatedMedicine?.id) {
          throw new Error('복약 시간 등록에 필요한 약별 ID가 없습니다.');
        }

        for (const [doseTimeIndex, doseTime] of medicine.doseTimes.entries()) {
          await createScheduleTimeMutation.mutateAsync({
            medicationScheduleMedicineId: updatedMedicine.id,
            timing: doseTime.timing,
            takeTime: doseTime.takeTime.slice(0, 5),
            sortOrder: doseTimeIndex + 1,
          });
        }
      }

      toast.success('처방 내역 정보가 수정되었습니다.');
      setPrescriptionAnalysisByScheduleId((prev) => {
        const next = { ...prev };
        delete next[schedule.id];
        return next;
      });
      handleCancelEditPrescription();
    } catch (error) {
      console.error('처방 내역 수정 실패:', error);
      toast.error('처방 내역 수정에 실패했습니다.');
    }
  };

  const handleDeletePrescription = (schedule: MedicationSchedule) => {
    const title = getPrescriptionTitle(schedule);

    const isConfirmed = window.confirm(
      `${title}을(를) 삭제하시겠습니까?\n삭제하면 해당 처방 내역의 약과 복용 시간도 함께 삭제됩니다.`,
    );

    if (!isConfirmed) {
      return;
    }

    deleteMedicationScheduleMutation.mutate(schedule.id, {
      onSuccess: () => {
        toast.success('처방 내역이 삭제되었습니다.');
        setPrescriptionAnalysisByScheduleId((prev) => {
          const next = { ...prev };
          delete next[schedule.id];
          return next;
        });

        if (editingPrescriptionId === schedule.id) {
          handleCancelEditPrescription();
        }
      },
      onError: (error) => {
        console.error('처방 내역 삭제 실패:', error);
        toast.error('처방 내역 삭제에 실패했습니다.');
      },
    });
  };

  const handleAnalyzePrescription = async (schedule: MedicationSchedule) => {
    setAnalyzingPrescriptionId(schedule.id);

    try {
      const analysis = await prescriptionAnalysisMutation.mutateAsync(
        schedule.id,
      );

      setPrescriptionAnalysisByScheduleId((prev) => ({
        ...prev,
        [schedule.id]: analysis,
      }));
      toast.success('처방 내역 분석이 완료되었습니다.');
    } catch (error) {
      console.error('처방 내역 분석 실패:', error);
      toast.error('처방 내역 분석에 실패했습니다.');
    } finally {
      setAnalyzingPrescriptionId(null);
    }
  };

  const loadSmartPillAssignments = async (
    deviceId: string,
    timeGroups: SmartPillTimeGroup[],
  ) => {
    try {
      const response = await getSmartPillSlotAssignments(deviceId);
      setSmartPillAssignments(
        createSmartPillAssignmentsFromResponse(response, timeGroups),
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setSmartPillAssignments(
          createDefaultSmartPillAssignments(timeGroups),
        );
        return;
      }

      throw error;
    }
  };

  const handleOpenSmartPillModal = async (schedule: MedicationSchedule) => {
    setIsSmartPillAssignmentLoading(true);

    try {
      const scheduleTimes = await getMedicationScheduleTimes(schedule.id);
      const timeGroups = buildSmartPillTimeGroups(schedule, scheduleTimes);

      if (timeGroups.length === 0) {
        toast.error('스마트 약통에 연결할 복용 시간이 없습니다.');
        return;
      }

      const deviceId =
        smartPillDevices[0]?.deviceId ||
        smartPillDeviceId.trim() ||
        DEFAULT_SMARTPILL_DEVICE_ID;

      setSmartPillModalSchedule(schedule);
      setSmartPillDeviceId(deviceId);
      setSmartPillTimeGroups(timeGroups);
      setSmartPillAssignments(createDefaultSmartPillAssignments(timeGroups));

      await loadSmartPillAssignments(deviceId, timeGroups);
    } catch (error) {
      console.error('스마트 약통 연결 정보 불러오기 실패:', error);
      toast.error('스마트 약통 연결 정보를 불러오지 못했습니다.');
    } finally {
      setIsSmartPillAssignmentLoading(false);
    }
  };

  const handleReloadSmartPillAssignments = async () => {
    const deviceId = smartPillDeviceId.trim();

    if (!deviceId) {
      toast.error('디바이스 ID를 입력해주세요.');
      return;
    }

    setIsSmartPillAssignmentLoading(true);

    try {
      setSmartPillAssignments(
        createDefaultSmartPillAssignments(smartPillTimeGroups),
      );
      await loadSmartPillAssignments(deviceId, smartPillTimeGroups);
      toast.success('스마트 약통 연결 정보를 불러왔습니다.');
    } catch (error) {
      console.error('스마트 약통 연결 정보 불러오기 실패:', error);
      toast.error('스마트 약통 연결 정보를 불러오지 못했습니다.');
    } finally {
      setIsSmartPillAssignmentLoading(false);
    }
  };

  const handleSaveSmartPillAssignments = async () => {
    const deviceId = smartPillDeviceId.trim();

    if (!deviceId) {
      toast.error('디바이스 ID를 입력해주세요.');
      return;
    }

    const slots = SMARTPILL_SLOT_NUMBERS.map((slotNumber) => {
      const selectedGroup = smartPillTimeGroups.find(
        (group) => group.key === smartPillAssignments[slotNumber],
      );

      return {
        slotNumber,
        medicationScheduleTimeIds: selectedGroup?.scheduleTimeIds ?? [],
      };
    });

    if (slots.every((slot) => slot.medicationScheduleTimeIds.length === 0)) {
      toast.error('한 개 이상의 약통 칸을 복용 시간과 연결해주세요.');
      return;
    }

    const registeredDevice = smartPillDevices.find(
      (device) => device.deviceId === deviceId,
    );

    try {
      const response = await saveSmartPillAssignmentsMutation.mutateAsync({
        deviceId,
        body: {
          name: registeredDevice?.name || '내 스마트 약통',
          slots,
        },
      });

      setSmartPillAssignments(
        createSmartPillAssignmentsFromResponse(
          response,
          smartPillTimeGroups,
        ),
      );
      toast.success(
        '스마트 약통 연결을 저장했습니다. 자동 복약 감지는 중지됩니다.',
      );
      setSmartPillModalSchedule(null);
    } catch (error) {
      console.error('스마트 약통 연결 저장 실패:', error);
      toast.error('스마트 약통 연결 저장에 실패했습니다.');
    }
  };

  const resetCautionForm = () => {
    setCautionSourceType('MEDICINE');
    setCautionKeyword('');
    setSelectedCautionTarget(null);
    setReason('ALLERGY');
    setMemo('');
    setIsCautionSearchOpen(false);
    setIsCautionFormOpen(false);
    setEditingCautionId(null);
  };

  const handleChangeCautionSourceType = (sourceType: CautionTargetType) => {
    setCautionSourceType(sourceType);
    setCautionKeyword('');
    setSelectedCautionTarget(null);
    setIsCautionSearchOpen(false);
  };

  const handleSelectCautionTarget = (target: {
    name: string;
    type: CautionTargetType;
  }) => {
    setSelectedCautionTarget(target);
    setCautionKeyword(target.name);
    setIsCautionSearchOpen(false);
  };

  const handleStartEditCaution = (item: CautionItem) => {
    const isMedicine = Boolean(item.itemName);
    const targetName = item.itemName || item.ingredientName || '';
    const targetType: CautionTargetType = isMedicine
      ? 'MEDICINE'
      : 'INGREDIENT';

    setEditingCautionId(item.id);
    setIsCautionFormOpen(true);
    setCautionSourceType(targetType);
    setCautionKeyword(targetName);
    setSelectedCautionTarget({
      name: targetName,
      type: targetType,
    });
    setReason(item.reason);
    setMemo(item.memo ?? '');
    setIsCautionSearchOpen(false);
  };

  const handleSaveCaution = () => {
    if (!selectedCautionTarget) {
      toast.error('등록할 약 또는 성분을 검색 결과에서 선택해주세요.');
      return;
    }

    const isMedicine = selectedCautionTarget.type === 'MEDICINE';

    const body: CautionRequest = {
      itemSeq: null,
      itemName: isMedicine ? selectedCautionTarget.name : null,
      ingredientCode: null,
      ingredientName: isMedicine ? null : selectedCautionTarget.name,
      reason,
      cautionType: selectedCautionTarget.type,
      memo: memo.trim() || null,
    };

    if (editingCautionId !== null) {
      updateCautionMutation.mutate(
        {
          id: editingCautionId,
          body,
        },
        {
          onSuccess: () => {
            toast.success('주의 약/성분이 수정되었습니다.');
            resetCautionForm();
          },
          onError: (error) => {
            console.error('주의 약/성분 수정 실패:', error);
            toast.error('주의 약/성분 수정에 실패했습니다.');
          },
        },
      );

      return;
    }

    createCautionMutation.mutate(body, {
      onSuccess: () => {
        toast.success('주의 약/성분이 등록되었습니다.');
        resetCautionForm();
      },
      onError: (error) => {
        console.error('주의 약/성분 등록 실패:', error);
        toast.error('주의 약/성분 등록에 실패했습니다.');
      },
    });
  };

  const handleDeleteCaution = (id: number) => {
    deleteCautionMutation.mutate(id, {
      onSuccess: () => {
        toast.success('주의 약/성분이 삭제되었습니다.');

        if (editingCautionId === id) {
          resetCautionForm();
        }
      },
      onError: (error) => {
        console.error('주의 약/성분 삭제 실패:', error);
        toast.error('주의 약/성분 삭제에 실패했습니다.');
      },
    });
  };

  const handleClosePasswordModal = () => {
    if (updatePasswordMutation.isPending) {
      return;
    }

    setIsPasswordModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setHasTriedPasswordChange(false);
  };

  const handleUpdatePassword = () => {
    setHasTriedPasswordChange(true);

    const passwordValidationMessage =
      getPasswordValidationMessage(newPassword);

    if (!oldPassword) {
      toast.error('현재 비밀번호를 입력해주세요.');
      return;
    }

    if (passwordValidationMessage) {
      toast.error(passwordValidationMessage);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    updatePasswordMutation.mutate(
      {
        oldPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          toast.success('비밀번호가 변경되었습니다.');
          setIsPasswordModalOpen(false);
          setOldPassword('');
          setNewPassword('');
          setNewPasswordConfirm('');
          setHasTriedPasswordChange(false);
        },
        onError: (error) => {
          console.error('비밀번호 변경 실패:', error);
          toast.error('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-extrabold text-white shadow-sm shadow-blue-600/20">
                {profileInfo.name.slice(0, 1)}
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {profileInfo.name}
                </h2>
                <p className="text-sm text-slate-500">{profileInfo.email}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="blue">
                {profileInfo.role === 'PHARMACIST'
                  ? '약사'
                  : profileInfo.role === 'ADMIN'
                    ? '관리자'
                    : '일반 사용자'}
              </Badge>
              {/* <Badge variant="blue">일반 사용자</Badge> */}
              <Badge variant="green">활성 계정</Badge>
              <Badge variant="yellow">주의 성분 {cautionList.length}건</Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200"
            onClick={() => setIsPasswordModalOpen(true)}
          >
            비밀번호 변경
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-8">
          <div className="flex gap-8 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  'border-b-2 pb-3 pt-4 text-sm font-semibold transition whitespace-nowrap',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>

        <div className="p-6">
          {isMyProfileLoading && (
            <div className={`${noticeClass} mb-4`}>
              내 정보를 불러오는 중입니다.
            </div>
          )}

          {isMyProfileError && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              내 정보를 불러오지 못했습니다.
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">기본 정보</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={infoTileClass}>
                  <p className="text-sm text-slate-500">이름</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profileInfo.name}
                  </p>
                </div>

                <div className={infoTileClass}>
                  <p className="text-sm text-slate-500">이메일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profileInfo.email}
                  </p>
                </div>

                <div className={infoTileClass}>
                  <p className="text-sm text-slate-500">생년월일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profileInfo.birthDate}
                  </p>
                </div>

                <div className={infoTileClass}>
                  <p className="text-sm text-slate-500">성별</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profileInfo.gender}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    건강 정보
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    복약 안내와 약사 상담에 참고되는 건강 상태와 기저질환
                    정보를 관리합니다.
                  </p>
                </div>

                {!isHealthEditing && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartEditHealthInfo}
                  >
                    수정
                  </Button>
                )}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  건강 상태
                </p>

                <div className="grid gap-3 grid-cols-3">
                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isPregnant: !current.isPregnant,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isPregnant
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    임산부
                  </button>

                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isBreastfeeding: !current.isBreastfeeding,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isBreastfeeding
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    모유수유 중
                  </button>

                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isSmoking: !current.isSmoking,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isSmoking
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    흡연
                  </button>

                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isDrinking: !current.isDrinking,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isDrinking
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    음주
                  </button>

                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isChild: !current.isChild,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isChild
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    소아
                  </button>

                  <button
                    type="button"
                    disabled={!isHealthEditing}
                    onClick={() =>
                      updateHealthForm((current) => ({
                        ...current,
                        isElderly: !current.isElderly,
                      }))
                    }
                    className={[
                      choiceBaseClass,
                      healthForm.isElderly
                        ? choiceSelectedClass
                        : choiceDefaultClass,
                      isHealthEditing
                        ? 'cursor-pointer hover:border-blue-300'
                        : 'cursor-default opacity-80',
                    ].join(' ')}
                  >
                    고령자
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  기저질환
                </p>

                {healthForm.diseases.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {healthForm.diseases.map((disease) =>
                      isHealthEditing ? (
                        <button
                          key={disease.code}
                          type="button"
                          onClick={() =>
                            handleRemoveHealthDisease(disease.code)
                          }
                          className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
                        >
                          {disease.name} ×
                        </button>
                      ) : (
                        <span
                          key={disease.code}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
                        >
                          {disease.name}
                        </span>
                      ),
                    )}
                  </div>
                )}

                <div className="relative">
                  <Input
                    placeholder={
                      isHealthEditing
                        ? '예: 고혈압, 당뇨병, 위염'
                        : '수정 버튼을 눌러 기저질환을 변경할 수 있습니다.'
                    }
                    value={healthDiseaseKeyword}
                    disabled={!isHealthEditing}
                    onChange={(event) =>
                      handleChangeHealthDiseaseKeyword(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        handleAddHealthDisease(healthDiseaseKeyword);
                      }
                    }}
                    onFocus={() => {
                      if (isHealthEditing) {
                        setIsHealthDiseaseSearchOpen(
                          healthDiseaseKeyword.trim().length >= 2,
                        );
                      }
                    }}
                  />

                  {isHealthEditing && isHealthDiseaseSearchOpen && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                        기저질환 검색 결과
                      </div>

                      <div className="max-h-56 overflow-y-auto">
                        {isDiseaseSuggestLoading && (
                          <div className="px-3 py-4 text-sm text-slate-500">
                            기저질환을 검색하고 있습니다.
                          </div>
                        )}

                        {!isDiseaseSuggestLoading &&
                          filteredHealthDiseases.map((disease) => (
                            <button
                              key={disease.name}
                              type="button"
                              onClick={() => handleSelectHealthDisease(disease)}
                              className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                            >
                              <p className="font-semibold text-slate-900">
                                {disease.name}
                              </p>
                            </button>
                          ))}

                        {!isDiseaseSuggestLoading && filteredHealthDiseases.length === 0 && (
                          <div className="px-3 py-4 text-sm text-slate-500">
                            일치하는 기저질환 결과가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  검색 결과를 선택하거나 직접 입력한 뒤 Enter 또는 쉼표로
                  추가할 수 있습니다.
                </p>
              </div>

              <div className={noticeClass}>
                건강 정보는 약 검색, AI 챗봇, 약사 상담에서 참고 정보로
                활용됩니다. 알레르기/주의 성분은 별도 탭에서 관리합니다.
              </div>

              {isHealthEditing && (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={handleCancelEditHealthInfo}
                    disabled={updateMyProfileMutation.isPending}
                  >
                    취소
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveHealthInfo}
                    disabled={updateMyProfileMutation.isPending}
                  >
                    {updateMyProfileMutation.isPending
                      ? '저장 중...'
                      : '건강 정보 저장'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'caution' && (
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
                  {isCautionFormOpen ? '닫기' : '추가'}
                </Button>
              </div>

              {isCautionFormOpen && (
                <div className={softSectionClass}>
                  <h3 className="font-bold text-slate-900">
                    {editingCautionId !== null
                      ? '주의 약/성분 수정'
                      : '주의 약/성분 추가'}
                  </h3>

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      등록 기준
                    </p>

                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleChangeCautionSourceType('MEDICINE')
                        }
                        className={[
                          'rounded-xl border px-4 py-3 text-sm font-semibold transition',
                          cautionSourceType === 'MEDICINE'
                            ? choiceSelectedClass
                            : choiceDefaultClass,
                        ].join(' ')}
                      >
                        약으로 등록
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleChangeCautionSourceType('INGREDIENT')
                        }
                        className={[
                          'rounded-xl border px-4 py-3 text-sm font-semibold transition',
                          cautionSourceType === 'INGREDIENT'
                            ? choiceSelectedClass
                            : choiceDefaultClass,
                        ].join(' ')}
                      >
                        성분으로 등록
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      {cautionSourceType === 'MEDICINE'
                        ? '약 검색'
                        : '성분 검색'}
                    </p>

                    <div className="relative">
                      <Input
                        placeholder={
                          cautionSourceType === 'MEDICINE'
                            ? '예: 아스피린, 타이레놀'
                            : '예: NSAIDs, 아세트아미노펜'
                        }
                        value={cautionKeyword}
                        onChange={(event) => {
                          setCautionKeyword(event.target.value);
                          setSelectedCautionTarget(null);
                          setIsCautionSearchOpen(true);
                        }}
                        onFocus={() => setIsCautionSearchOpen(true)}
                      />

                      {cautionKeyword.trim().length > 0 &&
                        cautionKeyword.trim().length < 2 && (
                          <p className="mt-2 text-xs text-slate-500">
                            두 글자 이상 입력하면 검색됩니다.
                          </p>
                        )}

                      {isCautionSearchOpen &&
                        cautionKeyword.trim().length >= 2 && (
                          <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                            <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                              {getCautionSourceLabel(cautionSourceType)} 검색
                              결과
                            </div>

                            <div className="max-h-56 overflow-y-auto">
                              {isCautionSuggestLoading && (
                                <div className="px-3 py-4 text-sm text-slate-500">
                                  검색 중입니다.
                                </div>
                              )}

                              {!isCautionSuggestLoading &&
                                cautionSuggestions.map((target) => (
                                  <button
                                    key={`${target.type}-${target.name}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectCautionTarget(target)
                                    }
                                    className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                                  >
                                    <p className="font-semibold text-slate-900">
                                      {target.name}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {target.type === 'MEDICINE'
                                        ? '약'
                                        : '성분'}
                                    </p>
                                  </button>
                                ))}

                              {!isCautionSuggestLoading &&
                                cautionSuggestions.length === 0 && (
                                  <div className="px-3 py-4 text-sm text-slate-500">
                                    검색 결과가 없습니다.
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                    </div>

                    {selectedCautionTarget && (
                      <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                        선택됨:{' '}
                        <span className="font-semibold text-blue-700">
                          {selectedCautionTarget.name}
                        </span>
                      </div>
                    )}
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
                    className={selectClass}
                    >
                      {reasonOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-sm text-slate-700">메모</p>
                    <Input
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
                      onClick={resetCautionForm}
                    >
                      취소
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSaveCaution}
                      disabled={
                        createCautionMutation.isPending ||
                        updateCautionMutation.isPending
                      }
                    >
                      {createCautionMutation.isPending ||
                      updateCautionMutation.isPending
                        ? '저장 중...'
                        : editingCautionId !== null
                          ? '수정 완료'
                          : '저장'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {isCautionLoading && (
                  <div className={`col-span-2 ${noticeClass}`}>
                    주의 약/성분 목록을 불러오는 중입니다.
                  </div>
                )}

                {isCautionError && (
                  <div className="col-span-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                    주의 약/성분 목록을 불러오지 못했습니다.
                  </div>
                )}

                {!isCautionLoading &&
                  !isCautionError &&
                  cautionList.length === 0 && (
                    <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                      등록된 주의 약/성분이 없습니다.
                    </div>
                  )}

                {!isCautionLoading &&
                  !isCautionError &&
                  cautionList.map((item) => {
                    const targetName =
                      item.itemName || item.ingredientName || '이름 정보 없음';

                    const sourceType: CautionTargetType = item.itemName
                      ? 'MEDICINE'
                      : 'INGREDIENT';

                    const targetCode = item.itemSeq || item.ingredientCode;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-900">{targetName}</p>
                              <Badge variant={getReasonBadge(item.reason)}>
                                {getReasonLabel(item.reason)}
                              </Badge>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant={sourceType === 'MEDICINE' ? 'blue' : 'green'}>
                                {getCautionSourceLabel(sourceType)}
                              </Badge>
                              {targetCode && (
                                <p className="text-sm text-slate-500">
                                  코드: {targetCode}
                                </p>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                              {item.memo || '등록된 메모가 없습니다.'}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="border border-slate-200"
                              onClick={() => handleStartEditCaution(item)}
                            >
                              수정
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="border border-slate-200"
                              onClick={() => handleDeleteCaution(item.id)}
                              disabled={deleteCautionMutation.isPending}
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'timePreset' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">복약 시간 설정</h2>
                <p className="mt-1 text-sm text-slate-500">
                  하루 복용 횟수별 기본 시간을 저장하면 복약 등록과 OCR 등록 시 자동으로 적용됩니다.
                </p>
              </div>

              {isMedicationTimePresetLoading && (
                <div className={noticeClass}>
                  복약 기본 시간을 불러오는 중입니다.
                </div>
              )}

              {isMedicationTimePresetError && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  복약 기본 시간을 불러오지 못했습니다.
                </div>
              )}

              {!isMedicationTimePresetLoading && !isMedicationTimePresetError && (
                <div className="space-y-4">
                  {medicationTimePresetForm.map((preset) => (
                    <div
                      key={preset.timesPerDay}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            하루 {preset.timesPerDay}회 복용
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {preset.timesPerDay}회 복용 약을 등록할 때 사용할 기본 시간입니다.
                          </p>
                        </div>

                        <Badge variant="blue">{preset.slots.length}개 시간</Badge>
                      </div>

                      <div className="mt-4 flex gap-3">
                        {preset.slots.map((slot) => (
                          <div
                            key={`${preset.timesPerDay}-${slot.sortOrder}`}
                            className="flex-1 rounded-xl bg-slate-50 p-3"
                          >
                            <p className="mb-2 text-sm font-medium text-slate-700">
                              {slot.sortOrder}회차
                            </p>

                            <Input
                              type="time"
                              value={slot.takeTime}
                              onChange={(event) =>
                                handleChangeMedicationTimePreset(
                                  preset.timesPerDay,
                                  slot.sortOrder,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className={noticeClass}>
                    저장된 기본 시간은 이후 복약 등록 화면에서 하루 복용 횟수를 선택할 때 자동 적용됩니다.
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="border border-slate-200"
                      onClick={handleResetMedicationTimePresets}
                    >
                      기본값으로 되돌리기
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSaveMedicationTimePresets}
                      disabled={updateMedicationTimePresetsMutation.isPending}
                    >
                      {updateMedicationTimePresetsMutation.isPending
                        ? '저장 중...'
                        : '복약 시간 저장'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">처방 내역</h2>
                <p className="mt-1 text-sm text-slate-500">
                  복약 등록과 OCR 처방 내역 업로드로 생성된 처방 묶음을 확인합니다.
                </p>
              </div>

              {isMedicationScheduleLoading && (
                <div className={noticeClass}>
                  처방 내역 정보를 불러오는 중입니다.
                </div>
              )}

              {isMedicationScheduleError && (
                <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">
                  처방 내역 정보를 불러오지 못했습니다. 로그인 상태와 서버를
                  확인해주세요.
                </div>
              )}

              {!isMedicationScheduleLoading &&
                !isMedicationScheduleError &&
                medicationSchedules.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                    등록된 처방 내역이 없습니다.
                  </div>
                )}

              {!isMedicationScheduleLoading &&
                !isMedicationScheduleError &&
                medicationSchedules.map((schedule) => {
                  const medicines = getScheduleMedicines(schedule);
                  const status = getPrescriptionStatus(schedule);
                  const range = getPrescriptionRange(schedule);
                  const prescriptionAnalysis =
                    prescriptionAnalysisByScheduleId[schedule.id];
                  const prescriptionAnalysisItems = prescriptionAnalysis
                    ? getPrescriptionAnalysisItems(prescriptionAnalysis)
                    : [];
                  const prescriptionGeneralCautionTags = prescriptionAnalysis
                    ? getPrescriptionGeneralCautionTags(prescriptionAnalysis)
                    : [];
                  const isAnalyzingPrescription =
                    analyzingPrescriptionId === schedule.id;

                  return (
                    <div
                      key={schedule.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {getPrescriptionTitle(schedule)}
                            </p>

                            <Badge
                              variant={status === '복용 중' ? 'green' : 'gray'}
                            >
                              {status}
                            </Badge>

                            <Badge variant="blue">
                              {medicines.length}개 약
                            </Badge>
                          </div>

                          <p className="mt-1.5 text-xs text-slate-400">
                            처방일 {getPrescriptionDate(schedule)}
                            {' · '}{range.startDate} ~ {range.endDate}
                            {' · '}{schedule.hospitalName || '병원 미상'}
                            {' / '}{schedule.pharmacyName || '약국 미상'}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="border border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleAnalyzePrescription(schedule)}
                            disabled={
                              isAnalyzingPrescription ||
                              deleteMedicationScheduleMutation.isPending
                            }
                          >
                            {isAnalyzingPrescription ? '분석 중...' : '주의 분석'}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="border border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenSmartPillModal(schedule)}
                            disabled={
                              isSmartPillAssignmentLoading ||
                              deleteMedicationScheduleMutation.isPending
                            }
                          >
                            {isSmartPillAssignmentLoading
                              ? '연결 정보 확인 중...'
                              : '스마트 약통 연결'}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="border border-slate-200"
                            onClick={() => handleStartEditPrescription(schedule)}
                            disabled={
                              isPrescriptionEditLoading ||
                              deleteMedicationScheduleMutation.isPending
                            }
                          >
                            {isPrescriptionEditLoading && editingPrescriptionId === schedule.id
                              ? '불러오는 중...'
                              : '수정'}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="border border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePrescription(schedule)}
                            disabled={
                              deleteMedicationScheduleMutation.isPending ||
                              updateMedicationScheduleMutation.isPending
                            }
                          >
                            {deleteMedicationScheduleMutation.isPending ? '삭제 중...' : '삭제'}
                          </Button>
                        </div>
                      </div>

                      {editingPrescriptionId === schedule.id && (
                        <div className={`${softSectionClass} mx-4 mb-4`}>
                          <h3 className="font-bold text-slate-900">처방 내역 전체 수정</h3>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Input
                              label="병원명"
                              value={prescriptionEditForm.hospitalName}
                              onChange={(event) =>
                                handleChangePrescriptionCommonForm('hospitalName', event.target.value)
                              }
                            />

                            <Input
                              label="약국명"
                              value={prescriptionEditForm.pharmacyName}
                              onChange={(event) =>
                                handleChangePrescriptionCommonForm('pharmacyName', event.target.value)
                              }
                            />

                            <Input
                              label="복용 시작일"
                              type="date"
                              value={prescriptionEditForm.startDate}
                              onChange={(event) =>
                                handleChangePrescriptionCommonForm('startDate', event.target.value)
                              }
                            />

                            <Input
                              label="복용 기간"
                              value={prescriptionEditForm.durationDays}
                              onChange={(event) =>
                                handleChangePrescriptionCommonForm('durationDays', event.target.value)
                              }
                            />
                          </div>

                          <div className="mt-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-900">약 목록</h4>

                              <Button type="button" size="sm" onClick={handleAddPrescriptionMedicine}>
                                약 추가
                              </Button>
                            </div>

                            {prescriptionEditForm.medicines.map((medicine, medicineIndex) => {
                              const isMedicineEditing = editingPrescriptionMedicineId === medicine.id;

                              return (
                                <div
                                  key={medicine.id}
                                  className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-slate-900">
                                          {medicine.customMedicineName || `약 ${medicineIndex + 1}`}
                                        </p>

                                        <Badge variant="blue">{medicine.timesPerDay}회/일</Badge>
                                        <Badge variant="gray">{medicine.durationDays}일분</Badge>
                                      </div>

                                      <p className="mt-2 text-sm text-slate-500">
                                        1회 {medicine.dosageAmount}
                                        {getDosageUnitLabel(medicine.dosageUnit)} ·{' '}
                                        {medicine.doseTimes.map((time) => time.takeTime).join(', ')}
                                      </p>
                                    </div>

                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="border border-slate-200"
                                        onClick={() =>
                                          setEditingPrescriptionMedicineId(
                                            isMedicineEditing ? null : medicine.id,
                                          )
                                        }
                                      >
                                        {isMedicineEditing ? '닫기' : '수정'}
                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="border border-slate-200"
                                        onClick={() => handleRemovePrescriptionMedicine(medicineIndex)}
                                      >
                                        삭제
                                      </Button>
                                    </div>
                                  </div>

                                  {!isMedicineEditing && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {medicine.doseTimes.map((doseTime, doseTimeIndex) => (
                                        <span
                                          key={`${medicine.id}-summary-${doseTimeIndex}`}
                                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                                        >
                                          {doseTimeIndex + 1}회차 {doseTime.takeTime} ·{' '}
                                          {
                                            medicationTimingOptions.find(
                                              (option) => option.value === doseTime.timing,
                                            )?.label
                                          }
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {isMedicineEditing && (
                                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <Input
                                          label="약 이름"
                                          value={medicine.customMedicineName}
                                          onChange={(event) =>
                                            handleChangePrescriptionMedicine(
                                              medicineIndex,
                                              'customMedicineName',
                                              event.target.value,
                                            )
                                          }
                                        />

                                        <Input
                                          label="1회 복용량"
                                          value={medicine.dosageAmount}
                                          onChange={(event) =>
                                            handleChangePrescriptionMedicine(
                                              medicineIndex,
                                              'dosageAmount',
                                              event.target.value,
                                            )
                                          }
                                        />

                                        <div>
                                          <p className="mb-2 text-sm font-medium text-slate-700">
                                            복용 단위
                                          </p>

                                          <select
                                            value={medicine.dosageUnit}
                                            onChange={(event) =>
                                              handleChangePrescriptionMedicine(
                                                medicineIndex,
                                                'dosageUnit',
                                                event.target.value as DosageUnit,
                                              )
                                            }
                                            className={selectClass}
                                          >
                                            {dosageUnitOptions.map((option) => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <p className="mb-2 text-sm font-medium text-slate-700">
                                            하루 복용 횟수
                                          </p>

                                          <div className="grid grid-cols-4 gap-2">
                                            {[1, 2, 3, 4].map((count) => (
                                              <button
                                                key={count}
                                                type="button"
                                                onClick={() =>
                                                  handleChangePrescriptionMedicine(
                                                    medicineIndex,
                                                    'timesPerDay',
                                                    String(count),
                                                  )
                                                }
                                                className={[
                                                  'rounded-xl border px-4 py-3 text-sm font-semibold transition',
                                                  medicine.timesPerDay === String(count)
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                                ].join(' ')}
                                              >
                                                {count}회
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                        <p className="font-bold text-slate-900">회차별 복용 시간</p>

                                        <div className="mt-3 space-y-3">
                                          {medicine.doseTimes.map((doseTime, doseTimeIndex) => (
                                            <div
                                              key={`${medicine.id}-${doseTimeIndex}`}
                                              className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[100px_1fr_1fr]"
                                            >
                                              <div className="flex items-center text-sm font-semibold text-slate-700">
                                                {doseTimeIndex + 1}회차
                                              </div>

                                              <Input
                                                type="time"
                                                value={doseTime.takeTime}
                                                onChange={(event) =>
                                                  handleChangePrescriptionDoseTime(
                                                    medicineIndex,
                                                    doseTimeIndex,
                                                    'takeTime',
                                                    event.target.value,
                                                  )
                                                }
                                              />

                                              <select
                                                value={doseTime.timing}
                                                onChange={(event) =>
                                                  handleChangePrescriptionDoseTime(
                                                    medicineIndex,
                                                    doseTimeIndex,
                                                    'timing',
                                                    event.target.value,
                                                  )
                                                }
                                                className={selectClass}
                                              >
                                                {medicationTimingOptions.map((option) => (
                                                  <option key={option.value} value={option.value}>
                                                    {option.label}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-5 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="border border-slate-200"
                              onClick={handleCancelEditPrescription}
                            >
                              취소
                            </Button>

                            <Button
                              type="button"
                              onClick={() => handleSavePrescription(schedule)}
                              disabled={
                                updateMedicationScheduleMutation.isPending ||
                                deleteMedicationScheduleTimeMutation.isPending ||
                                createScheduleTimeMutation.isPending
                              }
                            >
                              {updateMedicationScheduleMutation.isPending ||
                              deleteMedicationScheduleTimeMutation.isPending ||
                              createScheduleTimeMutation.isPending
                                ? '저장 중...'
                                : '처방 내역 수정 완료'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 px-4 py-3">
                        <div className={['grid gap-4', prescriptionAnalysis ? 'lg:grid-cols-2' : ''].join(' ')}>
                          <div>
                            {medicines.length === 0 ? (
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                                등록된 약 정보가 없습니다.
                              </div>
                            ) : (
                              <div className={['grid gap-2', prescriptionAnalysis ? '' : 'sm:grid-cols-2'].join(' ')}>
                                {medicines.map((medicine) => (
                                  <div
                                    key={medicine.id}
                                    className="rounded-lg bg-slate-50 px-3 py-2.5"
                                  >
                                    <p className="text-sm font-semibold text-slate-900">
                                      {getMedicineDisplayName(medicine)}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {getDosageText(medicine)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {prescriptionAnalysis && (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {/* 고정 헤더 */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-900">
                                    처방 내역 분석 결과
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {getPrescriptionAnalysisSummary(
                                      prescriptionAnalysis,
                                    )}
                                  </p>
                                </div>

                                <Badge
                                  variant={getPrescriptionAnalysisStatusBadgeVariant(
                                    prescriptionAnalysis,
                                  )}
                                >
                                  {getPrescriptionAnalysisStatusLabel(
                                    prescriptionAnalysis,
                                  )}
                                </Badge>
                              </div>

                              {/* 스크롤 영역 */}
                              <div className="max-h-64 overflow-y-auto px-3 py-2.5">
                                {prescriptionAnalysisItems.length > 0 && (
                                  <div className="divide-y divide-slate-100">
                                    {prescriptionAnalysisItems.map((item, index) => {
                                      const personalCautionLines =
                                        getPersonalCautionLines(item);
                                      const generalCautionTags =
                                        getAnalysisGeneralCautionTags(item);
                                      const medicineName = getAnalysisMedicineName(
                                        item,
                                        index,
                                      );
                                      const hasAnyCaution =
                                        personalCautionLines.length > 0 ||
                                        generalCautionTags.length > 0;

                                      return (
                                        <details
                                          key={`${item.scheduleMedicineId ?? index}-${medicineName}`}
                                          className="group py-2 first:pt-0 last:pb-0"
                                        >
                                          <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                                            {/* 펼치기 화살표 */}
                                            <svg
                                              className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                              strokeWidth={2.5}
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>

                                            {/* 약 이름 */}
                                            <span className="min-w-0 truncate text-sm font-semibold text-slate-700">
                                              {medicineName}
                                            </span>

                                            {/* 주의 없음 */}
                                            {!hasAnyCaution && (
                                              <span className="shrink-0 text-xs text-slate-400">주의 없음</span>
                                            )}

                                            {/* 건수 */}
                                            {personalCautionLines.length > 0 && (
                                              <span className="ml-auto shrink-0 text-xs font-semibold text-red-400">
                                                {personalCautionLines.length}건
                                              </span>
                                            )}
                                          </summary>

                                          {/* 펼쳐지는 상세 */}
                                          <div className="mt-1.5 pl-4">
                                            {/* 개인화 주의: 빨간 뱃지 */}
                                            {personalCautionLines.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {personalCautionLines.map((line) => {
                                                  const raw = line.includes(': ')
                                                    ? line.split(': ').slice(1).join(': ')
                                                    : line;
                                                  const label = raw === '수유부' ? '모유수유' : raw;
                                                  return (
                                                    <span
                                                      key={line}
                                                      className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"
                                                    >
                                                      {label}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* 일반 복약 주의: 노란 뱃지 */}
                                            {generalCautionTags.length > 0 && (
                                              <div className="mt-1.5 flex flex-wrap gap-1">
                                                {generalCautionTags.map((tag) => (
                                                  <span
                                                    key={tag}
                                                    className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* 처방 내역 페이지네이션 */}
          {!isMedicationScheduleLoading && !isMedicationScheduleError && prescriptionTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                type="button"
                onClick={() => setPrescriptionPage((p) => Math.max(0, p - 1))}
                disabled={prescriptionPage === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>

              {Array.from({ length: prescriptionTotalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrescriptionPage(i)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                    prescriptionPage === i
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPrescriptionPage((p) => Math.min(prescriptionTotalPages - 1, p + 1))}
                disabled={prescriptionPage >= prescriptionTotalPages - 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </Card>

      {isPasswordModalOpen && (
        <div
          className={modalOverlayClass}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className={`${modalPanelClass} max-w-md`}
          >
            <div>
              <h2
                id="password-modal-title"
                className="text-xl font-bold text-slate-900"
              >
                비밀번호 변경
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <Input
                label="현재 비밀번호"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                errorMessage={
                  hasTriedPasswordChange && !oldPassword
                    ? '현재 비밀번호를 입력해주세요.'
                    : undefined
                }
                disabled={updatePasswordMutation.isPending}
              />

              <Input
                label="새 비밀번호"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                errorMessage={
                  (hasTriedPasswordChange || newPassword.length > 0)
                    ? getPasswordValidationMessage(newPassword)
                    : undefined
                }
                disabled={updatePasswordMutation.isPending}
              />

              <Input
                label="새 비밀번호 확인"
                type="password"
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(event) =>
                  setNewPasswordConfirm(event.target.value)
                }
                errorMessage={
                  (hasTriedPasswordChange ||
                    newPasswordConfirm.length > 0) &&
                  newPassword !== newPasswordConfirm
                    ? '새 비밀번호가 일치하지 않습니다.'
                    : undefined
                }
                disabled={updatePasswordMutation.isPending}
              />
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={handleWithdrawAccount}
                disabled={withdrawAccountMutation.isPending}
              >
                {withdrawAccountMutation.isPending ? '탈퇴 처리 중...' : '회원 탈퇴'}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={handleClosePasswordModal}
                  disabled={updatePasswordMutation.isPending}
                >
                  취소
                </Button>

                <Button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending
                    ? '변경 중...'
                    : '비밀번호 변경'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {smartPillModalSchedule && (
        <div
          className={modalOverlayClass}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="smartpill-modal-title"
            className={`${modalPanelClass} max-h-[90vh] max-w-2xl overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="smartpill-modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  스마트 약통 연결
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getPrescriptionTitle(smartPillModalSchedule)}의 복용 시간을
                  약통 칸에 연결합니다.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSmartPillModalSchedule(null)}
                disabled={saveSmartPillAssignmentsMutation.isPending}
                aria-label="스마트 약통 연결 창 닫기"
              >
                닫기
              </Button>
            </div>

            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Input
                  label="디바이스 ID"
                  list="smartpill-device-options"
                  value={smartPillDeviceId}
                  onChange={(event) =>
                    setSmartPillDeviceId(event.target.value)
                  }
                  placeholder={DEFAULT_SMARTPILL_DEVICE_ID}
                  disabled={
                    isSmartPillAssignmentLoading ||
                    saveSmartPillAssignmentsMutation.isPending
                  }
                />

                <Button
                  type="button"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={handleReloadSmartPillAssignments}
                  disabled={
                    isSmartPillAssignmentLoading ||
                    saveSmartPillAssignmentsMutation.isPending
                  }
                >
                  {isSmartPillAssignmentLoading
                    ? '불러오는 중...'
                    : '연결 정보 불러오기'}
                </Button>
              </div>

              <datalist id="smartpill-device-options">
                {smartPillDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.name || device.deviceId}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="mt-6 space-y-3">
              {SMARTPILL_SLOT_NUMBERS.map((slotNumber) => (
                <label
                  key={slotNumber}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center"
                >
                  <span className="font-semibold text-slate-900">
                    {slotNumber}번 칸
                  </span>

                  <select
                    value={smartPillAssignments[slotNumber] ?? ''}
                    onChange={(event) =>
                      setSmartPillAssignments((current) => ({
                        ...current,
                        [slotNumber]: event.target.value,
                      }))
                    }
                    disabled={
                      isSmartPillAssignmentLoading ||
                      saveSmartPillAssignmentsMutation.isPending
                    }
                    className={selectClass}
                  >
                    <option value="">연결 안 함</option>
                    {smartPillTimeGroups.map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.takeTime} · {group.medicineNames.join(', ')}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <p className="mt-4 text-sm text-amber-700">
              연결 정보를 저장하면 자동 복약 감지는 중지됩니다. 스마트 약통
              페이지에서 감지를 다시 시작해주세요.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="border border-slate-200"
                onClick={() => setSmartPillModalSchedule(null)}
                disabled={saveSmartPillAssignmentsMutation.isPending}
              >
                취소
              </Button>

              <Button
                type="button"
                onClick={handleSaveSmartPillAssignments}
                disabled={
                  isSmartPillAssignmentLoading ||
                  saveSmartPillAssignmentsMutation.isPending
                }
              >
                {saveSmartPillAssignmentsMutation.isPending
                  ? '저장 중...'
                  : '연결 저장'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MyPage;
