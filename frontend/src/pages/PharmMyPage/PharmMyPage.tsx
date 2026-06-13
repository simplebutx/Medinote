import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
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

function PharmMyPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const { data: profile, isLoading, isError } = useMyProfile();
  const updatePharmacistProfileMutation = useUpdateMyPharmacistProfile();
  const registerPharmacyMutation = useRegisterPharmacy();
  const updatePharmacyMutation = useUpdatePharmacy();

  const navigate = useNavigate();
    const withdrawAccountMutation = useWithdrawAccount();

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
  } = usePharmacyDetail(pharmacyHpid);

  const [licenseNumber, setLicenseNumber] = useState<string | undefined>();
  const [licenseImage, setLicenseImage] = useState<File | null>(null);

  const [pharmacyForm, setPharmacyForm] =
    useState<PharmacyRegisterRequest>(defaultPharmacyForm);

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

  const displayedPharmacyName =
    pharmacyForm.pharmacyName ||
    pharmacyDetail?.pharmacyName ||
    pharmacyDetail?.name ||
    currentDocNumber ||
    '';

  const pharmacyDetailTime = pharmacyDetail as
    | Partial<PharmacyRegisterRequest>
    | undefined;

  const handleChangePharmacyForm = (
    key: keyof PharmacyRegisterRequest,
    value: string,
  ) => {
    setPharmacyForm((prev) => ({
      ...prev,
      [key]:
        key === 'latitude' || key === 'longitude' ? Number(value || 0) : value,
    }));
  };

  const handleSavePharmacy = async () => {
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
        displayedPharmacyName ||
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
        return;
      }

      await registerPharmacyMutation.mutateAsync(requestBody);

      setPharmacyMessage('약국 정보가 등록되었습니다.');
      setIsPharmacyMessageError(false);
      toast.success('약국 정보가 등록되었습니다.');
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
      toast.success('약사 정보가 수정되었습니다.');
    } catch (error) {
      console.error('약사 정보 수정 실패:', error);
      toast.error('약사 정보 수정에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist My Page
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          약사 마이페이지
        </h1>

        <p className="mt-2 text-slate-500">
          약사 계정 정보와 인증 정보를 확인하고 수정 요청합니다.
        </p>
      </div>

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

                <p className="mt-2 text-sm text-slate-500">{pharmacistEmail}</p>
              </div>

              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                약사 인증 정보는 관리자 승인 기준으로 관리됩니다.
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div>
                <h2 className="text-xl font-bold text-slate-900">기본 정보</h2>

                <p className="mt-1 text-sm text-slate-500">
                  약사 계정의 기본 정보를 확인합니다.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    이름
                  </label>
                  <Input value={pharmacistName} readOnly />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    이메일
                  </label>
                  <Input value={pharmacistEmail} readOnly />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    생년월일
                  </label>
                  <Input value={pharmacistBirthDate} readOnly />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    성별
                  </label>
                  <Input value={pharmacistGender} readOnly />
                </div>
              </div>
            </Card>

            <Card>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  약사 인증 정보
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  면허번호와 면허증 이미지를 확인하고 수정 요청할 수 있습니다.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    면허번호
                  </label>
                  <Input
                    value={displayedLicenseNumber}
                    onChange={(event) => setLicenseNumber(event.target.value)}
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
                    className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
                  />

                  {profile?.licenseImage && (
                    <p className="mt-2 text-xs text-slate-500">
                      기존 면허증 이미지가 등록되어 있습니다.
                    </p>
                  )}

                  {licenseImage && (
                    <p className="mt-2 text-xs text-blue-600">
                      선택한 파일: {licenseImage.name}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  약사 인증 정보를 수정하면 관리자 재승인이 필요할 수 있습니다.
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updatePharmacistProfileMutation.isPending}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatePharmacistProfileMutation.isPending
                      ? '수정 요청 중'
                      : '정보 수정 요청'}
                  </button>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900">약국 정보</h2>

                <p className="mt-1 text-sm text-slate-500">
                  가입 시 입력한 소속 약국명을 기준으로 상세 약국 정보를
                  등록합니다.
                </p>
              </div>

              {pharmacyMessage && (
                <div
                  className={[
                    'mt-4 rounded-2xl p-4 text-sm font-semibold',
                    isPharmacyMessageError
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700',
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
                <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                  이미 연결된 약국 정보가 있습니다. 필요한 경우 아래 정보를
                  수정해 저장할 수 있습니다.
                </div>
              ) : isPharmacyDetailError ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  아직 상세 약국 정보가 등록되지 않았습니다. 아래 정보를 입력해
                  등록해주세요.
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    약국명
                  </label>
                  <Input
                    value={displayedPharmacyName}
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
                  <Input
                    value={pharmacyForm.phone || pharmacyDetail?.phone || ''}
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
                  <Input
                    value={
                      pharmacyForm.address || pharmacyDetail?.address || ''
                    }
                    onChange={(event) =>
                      handleChangePharmacyForm('address', event.target.value)
                    }
                    placeholder="약국 상세 주소"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    위도
                  </label>
                  <Input
                    type="number"
                    value={pharmacyForm.latitude}
                    onChange={(event) =>
                      handleChangePharmacyForm('latitude', event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    경도
                  </label>
                  <Input
                    type="number"
                    value={pharmacyForm.longitude}
                    onChange={(event) =>
                      handleChangePharmacyForm('longitude', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    영업시간
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    요일별 운영 시작 시간과 종료 시간을 입력합니다.
                  </p>
                </div>

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
                        <Input
                          type="time"
                          value={toInputTime(
                            String(pharmacyForm[day.openKey] || pharmacyDetailTime?.[day.openKey] || ''),
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
                        <Input
                          type="time"
                          value={toInputTime(
                            String(pharmacyForm[day.closeKey] || pharmacyDetailTime?.[day.closeKey] || ''),
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
                입력한 약국 상세 정보와 영업시간이 함께 전송됩니다. 기존 약국
                정보가 있으면 수정 요청으로 저장됩니다.
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePharmacy}
                  disabled={
                    registerPharmacyMutation.isPending ||
                    updatePharmacyMutation.isPending
                  }
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerPharmacyMutation.isPending ||
                  updatePharmacyMutation.isPending
                    ? '저장 중'
                    : pharmacyDetail
                      ? '약국 정보 수정'
                      : '약국 정보 등록'}
                </button>
              </div>
            </Card>
          </div>
        </>
      )}
      <Card className="border-red-100 bg-red-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-red-700">약사 회원 탈퇴</h2>
            <p className="mt-2 text-sm text-red-600">
              탈퇴 시 약사 프로필, 약국 정보 등 계정 관련 정보가 삭제되며 복구할 수 없습니다.
            </p>
          </div>

          <Button
            type="button"
            variant="danger"
            onClick={handleWithdrawAccount}
            disabled={withdrawAccountMutation.isPending}
          >
            {withdrawAccountMutation.isPending ? '탈퇴 처리 중...' : '약사 회원 탈퇴'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default PharmMyPage;
