import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, PharmInput } from '../../components/ui';
import {
  usePharmacyDetail,
  useRegisterPharmacy,
  useUpdatePharmacy,
} from '../../features/pharmacy/hooks';
import type { PharmacyRegisterRequest } from '../../features/pharmacy/types';
import {
  useMyProfile,
  useUpdateMyPharmacistProfile,
  useWithdrawAccount,
} from '../../features/user/hooks';
import { useUpdatePassword } from '../../features/auth/hooks';

function getPasswordValidationMessage(value: string) {
  if (!value) return '비밀번호를 입력해주세요.';
  const hasAlphabet = /[A-Za-z]/.test(value);
  const hasSpecial = /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(value);
  const hasValidLength = value.length >= 8 && value.length <= 20;
  if (!hasValidLength || !hasAlphabet || !hasSpecial)
    return '비밀번호는 8자 이상 20자 이하이며 영문과 특수문자를 포함해야 합니다.';
  return '';
}

const modalOverlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm';
const modalPanelClass =
  'w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/10';

function getApprovalStatusLabel(status?: string | null, role?: string | null) {
  if (status === 'ACTIVE') return '승인 완료';
  if (status === 'WAITING_APPROVAL') return '승인 대기';
  if (status === 'PENDING') return '승인 대기';
  if (status === 'REJECTED') return '반려';

  if (role === 'PHARMACIST') return '승인 완료';

  return '확인 필요';
}

function getApprovalStatusBadge(status?: string | null, role?: string | null) {
  if (status === 'ACTIVE') return 'green';
  if (status === 'WAITING_APPROVAL') return 'yellow';
  if (status === 'PENDING') return 'yellow';
  if (status === 'REJECTED') return 'red';

  if (role === 'PHARMACIST') return 'green';

  return 'gray';
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'MALE') return '남성';
  if (gender === 'FEMALE') return '여성';
  return '-';
}

function toServerTime(value?: string | null) {
  if (!value) return '';

  return value.replace(':', '');
}

function toInputTime(value?: string | null) {
  if (!value) return '';

  if (value.includes(':')) return value;

  if (value.length === 4) {
    return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
  }

  return value;
}

function getBusinessHourText(
  open?: string | null,
  close?: string | null,
) {
  const openTime = toInputTime(open);
  const closeTime = toInputTime(close);

  if (!openTime || !closeTime) {
    return '정보 없음';
  }

  return `${openTime} ~ ${closeTime}`;
}

function normalizePharmacyTimeForServer(
  form: PharmacyRegisterRequest,
): PharmacyRegisterRequest {
  return {
    ...form,
    mondayOpen: toServerTime(form.mondayOpen),
    mondayClose: toServerTime(form.mondayClose),
    tuesdayOpen: toServerTime(form.tuesdayOpen),
    tuesdayClose: toServerTime(form.tuesdayClose),
    wednesdayOpen: toServerTime(form.wednesdayOpen),
    wednesdayClose: toServerTime(form.wednesdayClose),
    thursdayOpen: toServerTime(form.thursdayOpen),
    thursdayClose: toServerTime(form.thursdayClose),
    fridayOpen: toServerTime(form.fridayOpen),
    fridayClose: toServerTime(form.fridayClose),
    saturdayOpen: toServerTime(form.saturdayOpen),
    saturdayClose: toServerTime(form.saturdayClose),
    sundayOpen: toServerTime(form.sundayOpen),
    sundayClose: toServerTime(form.sundayClose),
    holidayOpen: toServerTime(form.holidayOpen),
    holidayClose: toServerTime(form.holidayClose),
  };
}

function getUserIdFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;

  try {
    const payload = accessToken.split('.')[1];

    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as {
      userId?: number | string;
      user_id?: number | string;
      id?: number | string;
    };

    return (
      decodedPayload.userId ??
      decodedPayload.user_id ??
      decodedPayload.id ??
      null
    );
  } catch {
    return null;
  }
}

const defaultPharmacyForm: PharmacyRegisterRequest = {
  pharmacyName: '',
  address: '',
  phone: '',
  latitude: 37.5665,
  longitude: 126.978,
  mondayOpen: '09:00',
  mondayClose: '18:00',
  tuesdayOpen: '09:00',
  tuesdayClose: '18:00',
  wednesdayOpen: '09:00',
  wednesdayClose: '18:00',
  thursdayOpen: '09:00',
  thursdayClose: '18:00',
  fridayOpen: '09:00',
  fridayClose: '18:00',
  saturdayOpen: '09:00',
  saturdayClose: '13:00',
  sundayOpen: '',
  sundayClose: '',
  holidayOpen: '',
  holidayClose: '',
};

const pharmacyBusinessDays = [
  {
    label: '월요일',
    openKey: 'mondayOpen',
    closeKey: 'mondayClose',
  },
  {
    label: '화요일',
    openKey: 'tuesdayOpen',
    closeKey: 'tuesdayClose',
  },
  {
    label: '수요일',
    openKey: 'wednesdayOpen',
    closeKey: 'wednesdayClose',
  },
  {
    label: '목요일',
    openKey: 'thursdayOpen',
    closeKey: 'thursdayClose',
  },
  {
    label: '금요일',
    openKey: 'fridayOpen',
    closeKey: 'fridayClose',
  },
  {
    label: '토요일',
    openKey: 'saturdayOpen',
    closeKey: 'saturdayClose',
  },
  {
    label: '일요일',
    openKey: 'sundayOpen',
    closeKey: 'sundayClose',
  },
  {
    label: '공휴일',
    openKey: 'holidayOpen',
    closeKey: 'holidayClose',
  },
] as const;

function PharmMedicationGuideAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="text-sm font-semibold text-slate-700">복약지도 안내 및 상담 범위</span>
        <span className={['text-slate-400 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-6 text-slate-600">
          <p>
            Medinote의 약사 상담은 약사법상 복약지도 범위를 기준으로 운영됩니다.
          </p>
          <p className="mt-3">
            약사법 제2조 제12호에 따르면 복약지도는 의약품의 명칭, 용법·용량, 효능·효과, 저장 방법, 부작용, 상호작용이나 성상 등의 정보를 제공하는 것과, 일반의약품 판매 시 진단적 판단 없이 구매자가 필요한 의약품을 선택할 수 있도록 돕는 것을 의미합니다.
          </p>
          <p className="mt-3">
            또한 약사법 제24조 제4항은 약사가 의약품을 조제하면 환자 또는 보호자에게 필요한 복약지도를 해야 한다고 규정하고 있습니다.
          </p>
          <p className="mt-3">
            이에 따라 Medinote의 약사 상담은 다음 범위 안에서 제공됩니다.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">상담 가능 영역</p>
              <ul className="space-y-1 text-xs text-slate-700">
                {[
                  '의약품의 복용법, 용법·용량 안내',
                  '효능·효과, 보관 방법, 부작용, 상호작용 안내',
                  '일반의약품 선택 도움',
                  '외용제 사용법 안내',
                  '중복 성분 및 복용 누락 확인',
                  '병원 방문이 필요한 상황에 대한 기준 안내',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">제한되는 상담 영역</p>
              <ul className="space-y-1 text-xs text-slate-700">
                {[
                  '질병명 확정 또는 진단',
                  '전문의약품 추천',
                  '처방약의 임의 변경, 중단, 증량, 감량 지시',
                  '사진이나 증상만을 근거로 한 진단',
                  '응급 상황에 대한 최종 판단',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 text-red-400">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            위 범위를 벗어나는 질문은 의료기관 방문 또는 의사 상담이 필요한 항목으로 안내됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

type PharmMyPageTab = 'profile' | 'license' | 'pharmacy';

const pharmMyPageTabs: { label: string; value: PharmMyPageTab }[] = [
  { label: '기본 정보', value: 'profile' },
  { label: '약사 인증 정보', value: 'license' },
  { label: '약국 정보', value: 'pharmacy' },
];

function PharmMyPage() {
  const [activeTab, setActiveTab] = useState<PharmMyPageTab>('profile');
  const accessToken = useUserStore((state) => state.accessToken);
  const { data: profile, isLoading, isError } = useMyProfile();
  const updatePharmacistProfileMutation = useUpdateMyPharmacistProfile();
  const registerPharmacyMutation = useRegisterPharmacy();
  const updatePharmacyMutation = useUpdatePharmacy();

  const navigate = useNavigate();
  const withdrawAccountMutation = useWithdrawAccount();
  const updatePasswordMutation = useUpdatePassword();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [hasTriedPasswordChange, setHasTriedPasswordChange] = useState(false);

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setHasTriedPasswordChange(false);
  };

  const handleUpdatePassword = () => {
    setHasTriedPasswordChange(true);
    if (!oldPassword || getPasswordValidationMessage(newPassword) || newPassword !== newPasswordConfirm) return;
    updatePasswordMutation.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('비밀번호가 변경되었습니다.');
          handleClosePasswordModal();
        },
        onError: () => {
          toast.error('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
        },
      },
    );
  };

  const handleWithdrawAccount = () => {
    const confirmed = window.confirm(
      '정말로 약사 회원 탈퇴하시겠습니까? 탈퇴 후 계정 정보는 복구할 수 없습니다.',
    );

    if (!confirmed) return;

    withdrawAccountMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('회원 탈퇴가 완료되었습니다.');
        navigate('/login', { replace: true });
      },
      onError: (error) => {
        console.error('약사 회원 탈퇴 실패:', error);
        toast.error('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
      },
    });
  };

  const tokenUserId = getUserIdFromAccessToken(accessToken);

  const pharmacistUserId =
    profile?.userId ?? profile?.user_id ?? profile?.id ?? tokenUserId ?? null;

  const pharmacyHpid = pharmacistUserId ? `MOCK_${pharmacistUserId}` : null;

  console.log('pharmacist profile:', profile);
  console.log('pharmacyHpid:', pharmacyHpid);

  const {
    data: pharmacyDetail,
    isLoading: isPharmacyDetailLoading,
    isError: isPharmacyDetailError,
    refetch: refetchPharmacyDetail,
  } = usePharmacyDetail(pharmacyHpid);

  const [licenseNumber, setLicenseNumber] = useState<string | undefined>();
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const [isLicenseEditing, setIsLicenseEditing] = useState(false);

  const [pharmacyForm, setPharmacyForm] =
    useState<PharmacyRegisterRequest>(defaultPharmacyForm);
  const [isPharmacyEditing, setIsPharmacyEditing] = useState(false);

  const [pharmacyMessage, setPharmacyMessage] = useState('');
  const [isPharmacyMessageError, setIsPharmacyMessageError] = useState(false);

  const pharmacistName = profile?.username ?? profile?.name ?? '-';
  const pharmacistEmail = profile?.email ?? '-';
  const pharmacistBirthDate = profile?.birthDate ?? profile?.birth_date ?? '-';
  const pharmacistGender = getGenderLabel(
    typeof profile?.gender === 'string' ? profile.gender : null,
  );

  const currentDocNumber = profile?.docNumber ?? '';
  const currentLicenseNumber = profile?.licenseNumber ?? '';
  const displayedLicenseNumber = licenseNumber ?? currentLicenseNumber;

  const pharmacyDetailTime = pharmacyDetail as
    | Partial<PharmacyRegisterRequest>
    | undefined;

  const savedPharmacyForm: PharmacyRegisterRequest = {
    ...defaultPharmacyForm,
    ...pharmacyDetailTime,
    pharmacyName:
      pharmacyDetail?.pharmacyName ||
      pharmacyDetail?.name ||
      currentDocNumber ||
      '',
    address: pharmacyDetail?.address || '',
    phone: pharmacyDetail?.phone || '',
    latitude: pharmacyDetail?.latitude ?? defaultPharmacyForm.latitude,
    longitude: pharmacyDetail?.longitude ?? defaultPharmacyForm.longitude,
  };

  const displayedPharmacyForm = isPharmacyEditing
    ? pharmacyForm
    : savedPharmacyForm;

  const handleChangePharmacyForm = (
    key: keyof PharmacyRegisterRequest,
    value: string,
  ) => {
    if (!isPharmacyEditing) {
      return;
    }

    setPharmacyForm((prev) => ({
      ...prev,
      [key]:
        key === 'latitude' || key === 'longitude' ? Number(value || 0) : value,
    }));
  };

  const handleStartEditPharmacy = () => {
    setPharmacyForm({
      ...savedPharmacyForm,
    });
    setPharmacyMessage('');
    setIsPharmacyMessageError(false);
    setIsPharmacyEditing(true);
  };

  const handleCancelEditPharmacy = () => {
    setPharmacyForm({
      ...savedPharmacyForm,
    });
    setPharmacyMessage('');
    setIsPharmacyMessageError(false);
    setIsPharmacyEditing(false);
  };

  const handleSavePharmacy = async () => {
    if (!isPharmacyEditing) {
      return;
    }

    setPharmacyMessage('');
    setIsPharmacyMessageError(false);

    const pharmacyDetailForm =
      pharmacyDetail as Partial<PharmacyRegisterRequest> | undefined;

    const pharmacyDetailName =
      pharmacyDetail && 'name' in pharmacyDetail
        ? String(pharmacyDetail.name ?? '')
        : '';

    const mergedPharmacyBody: PharmacyRegisterRequest = {
      ...defaultPharmacyForm,
      ...pharmacyDetailForm,
      ...pharmacyForm,
      pharmacyName:
        pharmacyForm.pharmacyName ||
        pharmacyDetailForm?.pharmacyName ||
        pharmacyDetailName ||
        currentDocNumber,
      address: pharmacyForm.address || pharmacyDetailForm?.address || '',
      phone: pharmacyForm.phone || pharmacyDetailForm?.phone || '',
      latitude:
        Number(pharmacyForm.latitude || pharmacyDetailForm?.latitude) || 37.5665,
      longitude:
        Number(pharmacyForm.longitude || pharmacyDetailForm?.longitude) ||
        126.978,
    };

    const requestBody = normalizePharmacyTimeForServer(mergedPharmacyBody);

    try {
      if (!requestBody.pharmacyName.trim()) {
        setPharmacyMessage('약국명을 입력해주세요.');
        setIsPharmacyMessageError(true);
        toast.error('약국명을 입력해주세요.');
        return;
      }

      if (!requestBody.address.trim()) {
        setPharmacyMessage('약국 주소를 입력해주세요.');
        setIsPharmacyMessageError(true);
        toast.error('약국 주소를 입력해주세요.');
        return;
      }

      if (!requestBody.phone.trim()) {
        setPharmacyMessage('약국 전화번호를 입력해주세요.');
        setIsPharmacyMessageError(true);
        toast.error('약국 전화번호를 입력해주세요.');
        return;
      }

      if (pharmacyDetail && pharmacyHpid) {
        await updatePharmacyMutation.mutateAsync({
          hpid: pharmacyHpid,
          body: requestBody,
        });

        setPharmacyMessage('약국 정보가 수정되었습니다.');
        setIsPharmacyMessageError(false);
        toast.success('약국 정보가 수정되었습니다.');
        await refetchPharmacyDetail();
        setIsPharmacyEditing(false);
        return;
      }

      await registerPharmacyMutation.mutateAsync(requestBody);

      setPharmacyMessage('약국 정보가 등록되었습니다.');
      setIsPharmacyMessageError(false);
      toast.success('약국 정보가 등록되었습니다.');
      await refetchPharmacyDetail();
      setIsPharmacyEditing(false);
    } catch (error) {
      console.error('약국 정보 저장 실패:', error);
      setPharmacyMessage(
        '약국 정보 저장에 실패했습니다. 서버의 약국 등록/수정 조건을 확인해주세요.',
      );
      setIsPharmacyMessageError(true);
      toast.error('약국 정보 저장에 실패했습니다.');
    }
  };

  const handleSave = async () => {
    if (!isLicenseEditing) {
      return;
    }

    const nextLicenseNumber = displayedLicenseNumber.trim();

    if (!nextLicenseNumber) {
      toast.error('면허번호를 입력해주세요.');
      return;
    }

    try {
      await updatePharmacistProfileMutation.mutateAsync({
        docNumber: currentDocNumber,
        licenseNumber: nextLicenseNumber,
        licenseImage,
      });

      setLicenseNumber(undefined);
      setLicenseImage(null);
      setIsLicenseEditing(false);
      toast.success('약사 정보가 수정되었습니다.');
    } catch (error) {
      console.error('약사 정보 수정 실패:', error);
      toast.error('약사 정보 수정에 실패했습니다.');
    }
  };

  const handleStartEditLicense = () => {
    setLicenseNumber(currentLicenseNumber);
    setLicenseImage(null);
    setIsLicenseEditing(true);
  };

  const handleCancelEditLicense = () => {
    setLicenseNumber(undefined);
    setLicenseImage(null);
    setIsLicenseEditing(false);
  };

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            약사 프로필 정보를 불러오지 못했습니다.
          </p>
          <p className="mt-1 text-sm text-red-600">
            로그인 상태와 권한을 확인해주세요.
          </p>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">
            약사 프로필 정보를 불러오는 중입니다.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-extrabold text-white shadow-sm shadow-emerald-700/20">
                  {pharmacistName.slice(0, 1)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {pharmacistName}
                    </h2>

                    <Badge
                      variant={getApprovalStatusBadge(
                        profile?.status,
                        profile?.role,
                      )}
                    >
                      {getApprovalStatusLabel(profile?.status, profile?.role)}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">{pharmacistEmail}</p>
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

          <Card className="p-0">
            <div className="flex overflow-x-auto border-b border-slate-200">
              {pharmMyPageTabs.map((tab) => {
                const isActive = activeTab === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={[
                      'min-w-fit px-5 py-4 text-sm font-semibold transition',
                      isActive
                        ? 'border-b-2 border-emerald-600 text-emerald-700'
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
                <div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">기본 정보</h2>

                <p className="mt-1 text-sm text-slate-500">
                  약사 계정의 기본 정보를 확인합니다.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이름</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {pharmacistName}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이메일</p>
                  <p className="mt-2 break-all font-semibold text-slate-900">
                    {pharmacistEmail}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">생년월일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {pharmacistBirthDate}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">성별</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {pharmacistGender}
                  </p>
                </div>
              </div>
                </div>
              )}

              {activeTab === 'license' && (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        약사 인증 정보
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        면허번호와 면허증 이미지를 확인하고 수정 요청할 수
                        있습니다.
                      </p>
                    </div>

                    {!isLicenseEditing && (
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        onClick={handleStartEditLicense}
                      >
                        수정
                      </Button>
                    )}
                  </div>

                  {isLicenseEditing ? (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-600">
                          면허번호
                        </label>
                        <PharmInput
                          value={displayedLicenseNumber}
                          onChange={(event) =>
                            setLicenseNumber(event.target.value)
                          }
                          placeholder="면허번호를 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-600">
                          면허증 이미지
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setLicenseImage(event.target.files?.[0] ?? null)
                          }
                          className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700"
                        />

                        {licenseImage && (
                          <p className="mt-2 text-xs text-emerald-600">
                            선택한 파일: {licenseImage.name}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        약사 인증 정보를 수정하면 관리자 재승인이 필요할 수
                        있습니다.
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-slate-200"
                          onClick={handleCancelEditLicense}
                          disabled={updatePharmacistProfileMutation.isPending}
                        >
                          취소
                        </Button>

                        <Button
                          type="button"
                          variant="emerald"
                          onClick={handleSave}
                          disabled={updatePharmacistProfileMutation.isPending}
                        >
                          {updatePharmacistProfileMutation.isPending
                            ? '수정 요청 중'
                            : '정보 수정 요청'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">면허번호</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {currentLicenseNumber || '등록 정보 없음'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">면허증 이미지</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {profile?.licenseImage
                            ? '등록 완료'
                            : '등록 정보 없음'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pharmacy' && (
                <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    약국 정보
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    가입 시 입력한 소속 약국명을 기준으로 상세 약국 정보를
                    관리합니다.
                  </p>
                </div>

                {!isPharmacyEditing && !isPharmacyDetailLoading && (
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={handleStartEditPharmacy}
                  >
                    수정
                  </Button>
                )}
              </div>

              {pharmacyMessage && (
                <div
                  className={[
                    'mt-4 rounded-2xl p-4 text-sm font-semibold',
                    isPharmacyMessageError
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700',
                  ].join(' ')}
                >
                  {pharmacyMessage}
                </div>
              )}

              {isPharmacyDetailLoading ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  기존 약국 정보를 불러오는 중입니다.
                </div>
              ) : pharmacyDetail ? (
                isPharmacyEditing ? (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                    약국 정보를 수정한 뒤 저장해주세요.
                  </div>
                ) : null
              ) : isPharmacyDetailError ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  아직 상세 약국 정보가 등록되지 않았습니다. 수정 버튼을 누른
                  뒤 정보를 입력해주세요.
                </div>
              ) : null}

              {isPharmacyEditing ? (
                <>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-600">
                        약국명
                      </label>
                      <PharmInput
                        value={displayedPharmacyForm.pharmacyName}
                        onChange={(event) =>
                          handleChangePharmacyForm(
                            'pharmacyName',
                            event.target.value,
                          )
                        }
                        placeholder="예: 메디노트 약국"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-600">
                        전화번호
                      </label>
                      <PharmInput
                        value={displayedPharmacyForm.phone}
                        onChange={(event) =>
                          handleChangePharmacyForm('phone', event.target.value)
                        }
                        placeholder="예: 02-1234-5678"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="text-sm font-semibold text-slate-600">
                        주소
                      </label>
                      <PharmInput
                        value={displayedPharmacyForm.address}
                        onChange={(event) =>
                          handleChangePharmacyForm(
                            'address',
                            event.target.value,
                          )
                        }
                        placeholder="약국 상세 주소"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-600">
                        위도
                      </label>
                      <PharmInput
                        type="number"
                        value={displayedPharmacyForm.latitude}
                        onChange={(event) =>
                          handleChangePharmacyForm(
                            'latitude',
                            event.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-600">
                        경도
                      </label>
                      <PharmInput
                        type="number"
                        value={displayedPharmacyForm.longitude}
                        onChange={(event) =>
                          handleChangePharmacyForm(
                            'longitude',
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-bold text-slate-900">
                      영업시간
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      요일별 운영 시작 시간과 종료 시간을 입력합니다.
                    </p>

                    <div className="mt-4 grid gap-3">
                      {pharmacyBusinessDays.map((day) => (
                        <div
                          key={day.label}
                          className="grid gap-3 rounded-2xl bg-slate-50 p-4 lg:grid-cols-[90px_1fr_1fr]"
                        >
                          <div className="flex items-center text-sm font-semibold text-slate-700">
                            {day.label}
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-500">
                              시작 시간
                            </label>
                            <PharmInput
                              type="time"
                              value={toInputTime(
                                String(
                                  displayedPharmacyForm[day.openKey] || '',
                                ),
                              )}
                              onChange={(event) =>
                                handleChangePharmacyForm(
                                  day.openKey,
                                  event.target.value,
                                )
                              }
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-500">
                              종료 시간
                            </label>
                            <PharmInput
                              type="time"
                              value={toInputTime(
                                String(
                                  displayedPharmacyForm[day.closeKey] || '',
                                ),
                              )}
                              onChange={(event) =>
                                handleChangePharmacyForm(
                                  day.closeKey,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    입력한 약국 상세 정보와 영업시간이 함께 저장됩니다.
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={handleCancelEditPharmacy}
                    disabled={
                      registerPharmacyMutation.isPending ||
                      updatePharmacyMutation.isPending
                    }
                  >
                    취소
                  </Button>

                  <Button
                    type="button"
                    variant="emerald"
                    onClick={handleSavePharmacy}
                    disabled={
                      registerPharmacyMutation.isPending ||
                      updatePharmacyMutation.isPending
                    }
                  >
                    {registerPharmacyMutation.isPending ||
                    updatePharmacyMutation.isPending
                      ? '저장 중'
                      : pharmacyDetail
                        ? '약국 정보 저장'
                        : '약국 정보 등록'}
                  </Button>
                </div>
                </>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">약국명</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {savedPharmacyForm.pharmacyName || '등록 정보 없음'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">전화번호</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {pharmacyDetail?.phone || '등록 정보 없음'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                      <p className="text-sm text-slate-500">주소</p>
                      <p className="mt-2 font-semibold leading-6 text-slate-900">
                        {pharmacyDetail?.address || '등록 정보 없음'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-bold text-slate-900">
                      영업시간
                    </h3>
                    <div className="mt-4 grid gap-3 md:grid-flow-col md:grid-cols-2 md:grid-rows-4">
                      {pharmacyBusinessDays.map((day) => (
                        <div
                          key={day.label}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-sm font-semibold text-slate-700">
                            {day.label}
                          </span>
                          <span className="text-sm text-slate-500">
                            {getBusinessHourText(
                              pharmacyDetailTime?.[day.openKey] as
                                | string
                                | null
                                | undefined,
                              pharmacyDetailTime?.[day.closeKey] as
                                | string
                                | null
                                | undefined,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
                </div>
              )}
            </div>
          </Card>

          {/* ── 복약지도 안내 및 상담 범위 ── */}
          <PharmMedicationGuideAccordion />
        </>
      )}
      {/* ── 비밀번호 변경 모달 ── */}
      {isPasswordModalOpen && (
        <div className={modalOverlayClass} role="presentation">
          <div role="dialog" aria-modal="true" className={`${modalPanelClass} max-w-md`}>
            <div>
              <h2 className="text-xl font-bold text-slate-900">비밀번호 변경</h2>
              <p className="mt-1 text-sm text-slate-500">
                현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <PharmInput
                label="현재 비밀번호"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                errorMessage={hasTriedPasswordChange && !oldPassword ? '현재 비밀번호를 입력해주세요.' : undefined}
                disabled={updatePasswordMutation.isPending}
              />
              <PharmInput
                label="새 비밀번호"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                errorMessage={(hasTriedPasswordChange || newPassword.length > 0) ? getPasswordValidationMessage(newPassword) : undefined}
                disabled={updatePasswordMutation.isPending}
              />
              <PharmInput
                label="새 비밀번호 확인"
                type="password"
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                errorMessage={(hasTriedPasswordChange || newPasswordConfirm.length > 0) && newPassword !== newPasswordConfirm ? '새 비밀번호가 일치하지 않습니다.' : undefined}
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
                  variant="emerald"
                  onClick={handleUpdatePassword}
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PharmMyPage;