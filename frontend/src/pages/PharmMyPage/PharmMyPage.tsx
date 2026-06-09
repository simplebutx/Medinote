import { useState } from 'react';

import { Badge, Card, Input } from '../../components/ui';
import {
  useMyProfile,
  useUpdateMyPharmacistProfile,
} from '../../features/user/hooks';
import { useRegisterPharmacy } from '../../features/pharmacy/hooks';
import type { PharmacyRegisterRequest } from '../../features/pharmacy/types';

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

function PharmMyPage() {
  const registerPharmacyMutation = useRegisterPharmacy();

  const [pharmacyForm, setPharmacyForm] =
    useState<PharmacyRegisterRequest>(defaultPharmacyForm);

  const [pharmacyMessage, setPharmacyMessage] = useState('');

  const handleChangePharmacyForm = (
    key: keyof PharmacyRegisterRequest,
    value: string,
  ) => {
    setPharmacyForm((prev) => ({
      ...prev,
      [key]:
        key === 'latitude' || key === 'longitude'
          ? Number(value || 0)
          : value,
    }));
  };

  const handleRegisterPharmacy = async () => {
    setPharmacyMessage('');

    try {
      if (!pharmacyForm.pharmacyName.trim()) {
        setPharmacyMessage('약국명을 입력해주세요.');
        return;
      }

      if (!pharmacyForm.address.trim()) {
        setPharmacyMessage('약국 주소를 입력해주세요.');
        return;
      }

      if (!pharmacyForm.phone.trim()) {
        setPharmacyMessage('약국 전화번호를 입력해주세요.');
        return;
      }

      await registerPharmacyMutation.mutateAsync(pharmacyForm);

      setPharmacyMessage('약국 정보가 등록되었습니다.');
    } catch {
      setPharmacyMessage(
        '약국 정보 등록에 실패했습니다. 백엔드 DB 초기화 또는 약국 등록 조건을 확인해주세요.',
      );
    }
  };
  
  const { data: profile, isLoading, isError } = useMyProfile();
  const updatePharmacistProfileMutation = useUpdateMyPharmacistProfile();

  const [docNumber, setDocNumber] = useState<string | undefined>();
  const [licenseNumber, setLicenseNumber] = useState<string | undefined>();
  const [licenseImage, setLicenseImage] = useState<File | null>(null);

  const pharmacistName = profile?.username ?? profile?.name ?? '-';
  const pharmacistEmail = profile?.email ?? '-';
  const pharmacistBirthDate = profile?.birthDate ?? profile?.birth_date ?? '-';
  const pharmacistGender = getGenderLabel(
    typeof profile?.gender === 'string' ? profile.gender : null,
  );

  const currentDocNumber = profile?.docNumber ?? '';
  const currentLicenseNumber = profile?.licenseNumber ?? '';

  const displayedDocNumber = docNumber ?? currentDocNumber;
  const displayedLicenseNumber = licenseNumber ?? currentLicenseNumber;

  const handleSave = async () => {
    const nextDocNumber = displayedDocNumber.trim();
    const nextLicenseNumber = displayedLicenseNumber.trim();

    if (!nextDocNumber || !nextLicenseNumber) {
      window.alert('소속 약국명과 면허번호를 입력해주세요.');
      return;
    }

    await updatePharmacistProfileMutation.mutateAsync({
      docNumber: nextDocNumber,
      licenseNumber: nextLicenseNumber,
      licenseImage,
    });

    setDocNumber(undefined);
    setLicenseNumber(undefined);
    setLicenseImage(null);
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

                <p className="mt-2 text-sm text-slate-500">
                  {pharmacistEmail}
                </p>
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
                  약사 인증 및 약국 정보
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  소속 약국명과 면허 정보를 확인하고 수정 요청할 수 있습니다.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    소속 약국명
                  </label>
                  <Input
                    value={displayedDocNumber}
                    onChange={(event) => setDocNumber(event.target.value)}
                    placeholder="소속 약국명을 입력하세요"
                  />
                </div>

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

            <Card>
              <div>
                <h2 className="text-xl font-bold text-slate-900">약국 정보</h2>

                <p className="mt-1 text-sm text-slate-500">
                  약사가 운영하거나 소속된 약국 정보를 등록합니다.
                </p>
              </div>

              {pharmacyMessage && (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                  {pharmacyMessage}
                </div>
              )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-600">약국명</label>
                  <Input
                    value={pharmacyForm.pharmacyName}
                    onChange={(event) =>
                      handleChangePharmacyForm('pharmacyName', event.target.value)
                    }
                    placeholder="예: 메디노트 약국"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">전화번호</label>
                  <Input
                    value={pharmacyForm.phone}
                    onChange={(event) =>
                      handleChangePharmacyForm('phone', event.target.value)
                    }
                    placeholder="예: 02-1234-5678"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-semibold text-slate-600">주소</label>
                  <Input
                    value={pharmacyForm.address}
                    onChange={(event) =>
                      handleChangePharmacyForm('address', event.target.value)
                    }
                    placeholder="약국 상세 주소"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">위도</label>
                  <Input
                    type="number"
                    value={pharmacyForm.latitude}
                    onChange={(event) =>
                      handleChangePharmacyForm('latitude', event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">경도</label>
                  <Input
                    type="number"
                    value={pharmacyForm.longitude}
                    onChange={(event) =>
                      handleChangePharmacyForm('longitude', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                약국 정보 등록 API는 현재 서버/DB 상태에 따라 실패할 수 있습니다. POST
                500이 발생하면 백엔드 DB 초기화 또는 약국 등록 로직을 확인해야 합니다.
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleRegisterPharmacy}
                  disabled={registerPharmacyMutation.isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerPharmacyMutation.isPending ? '등록 중' : '약국 정보 등록'}
                </button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default PharmMyPage;