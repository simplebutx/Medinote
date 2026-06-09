import { useMemo, useState } from 'react';

import { Badge, Card, Input } from '../../components/ui';
import {
  useDeletePharmacyInventory,
  useMyPharmacyInventory,
  useRegisterPharmacy,
  useUpsertPharmacyInventory,
} from '../../features/pharmacy/hooks';
import type {
  PharmacyInventory,
  PharmacyRegisterRequest,
} from '../../features/pharmacy/types';

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

const defaultInventoryForm = {
  pharmacyHpid: '',
  itemSeq: '',
  itemName: '',
  companyName: '',
  stockQuantity: 0,
};

const businessDays = [
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

function getPharmacyName(pharmacyName?: string | null, name?: string | null) {
  return pharmacyName || name || '등록된 약국';
}

function PharmPharmacyPage() {
  const [pharmacyForm, setPharmacyForm] =
    useState<PharmacyRegisterRequest>(defaultPharmacyForm);

  const [inventoryForm, setInventoryForm] = useState(defaultInventoryForm);
  const [message, setMessage] = useState('');

  const [registeredPharmacyHpid, setRegisteredPharmacyHpid] = useState('');

  const {
    data: inventories = [],
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useMyPharmacyInventory();

  const registerPharmacyMutation = useRegisterPharmacy();
  const upsertInventoryMutation = useUpsertPharmacyInventory();
  const deleteInventoryMutation = useDeletePharmacyInventory();

  const currentPharmacyHpid = useMemo(() => {
    return (
      registeredPharmacyHpid ||
      inventoryForm.pharmacyHpid ||
      inventories[0]?.pharmacyHpid ||
      ''
    );
  }, [registeredPharmacyHpid, inventoryForm.pharmacyHpid, inventories]);

  const totalStockQuantity = useMemo(() => {
    return inventories.reduce((sum, inventory) => {
      return sum + Number(inventory.stockQuantity || 0);
    }, 0);
  }, [inventories]);

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

  const handleChangeInventoryForm = (
    key: keyof typeof defaultInventoryForm,
    value: string,
  ) => {
    setInventoryForm((prev) => ({
      ...prev,
      [key]: key === 'stockQuantity' ? Number(value || 0) : value,
    }));
  };

  const handleRegisterPharmacy = async () => {
    setMessage('');

    if (!pharmacyForm.pharmacyName.trim()) {
      setMessage('약국명을 입력해주세요.');
      return;
    }

    if (!pharmacyForm.address.trim()) {
      setMessage('약국 주소를 입력해주세요.');
      return;
    }

    if (!pharmacyForm.phone.trim()) {
      setMessage('약국 전화번호를 입력해주세요.');
      return;
    }

    const result = await registerPharmacyMutation.mutateAsync(pharmacyForm);

    if (result.hpid) {
      setRegisteredPharmacyHpid(result.hpid);
      setInventoryForm((prev) => ({
        ...prev,
        pharmacyHpid: result.hpid,
      }));
    }

    setMessage(`${getPharmacyName(result.pharmacyName, result.name)} 정보가 등록되었습니다.`);
  };

  const handleSubmitInventory = async () => {
    setMessage('');

    const pharmacyHpid = inventoryForm.pharmacyHpid || currentPharmacyHpid;

    if (!pharmacyHpid.trim()) {
      setMessage('약국 등록 후 재고를 등록하거나 약국 HPID를 입력해주세요.');
      return;
    }

    if (!inventoryForm.itemSeq.trim()) {
      setMessage('약 품목코드(itemSeq)를 입력해주세요.');
      return;
    }

    if (!inventoryForm.itemName.trim()) {
      setMessage('약 이름을 입력해주세요.');
      return;
    }

    await upsertInventoryMutation.mutateAsync({
      pharmacyHpid,
      itemSeq: inventoryForm.itemSeq,
      itemName: inventoryForm.itemName,
      companyName: inventoryForm.companyName,
      stockQuantity: inventoryForm.stockQuantity,
    });

    setInventoryForm({
      ...defaultInventoryForm,
      pharmacyHpid,
    });

    setMessage('약국 재고가 저장되었습니다.');
  };

  const handleEditInventory = (inventory: PharmacyInventory) => {
    setInventoryForm({
      pharmacyHpid: inventory.pharmacyHpid,
      itemSeq: inventory.itemSeq,
      itemName: inventory.itemName,
      companyName: inventory.companyName ?? '',
      stockQuantity: inventory.stockQuantity,
    });

    setMessage('선택한 재고 정보를 수정할 수 있습니다.');
  };

  const handleDeleteInventory = async (inventoryId: number) => {
    setMessage('');

    await deleteInventoryMutation.mutateAsync(inventoryId);

    setMessage('약국 재고가 삭제되었습니다.');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist Pharmacy
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">약국 관리</h1>

        <p className="mt-2 text-slate-500">
          약국 정보를 등록하고 보유 의약품 재고를 관리합니다.
        </p>
      </div>

      {message && (
        <Card className="border-blue-100 bg-blue-50">
          <p className="text-sm font-semibold text-blue-700">{message}</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">약국 HPID</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {currentPharmacyHpid || '-'}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">등록 재고</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isInventoryLoading ? '-' : `${inventories.length}건`}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">총 재고 수량</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isInventoryLoading ? '-' : `${totalStockQuantity}개`}
          </p>
        </Card>
      </div>

      <Card>
        <div>
          <h2 className="text-xl font-bold text-slate-900">약국 정보 등록</h2>

          <p className="mt-1 text-sm text-slate-500">
            약국명, 주소, 전화번호, 위치와 영업시간을 등록합니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-600">
              약국명
            </label>
            <Input
              value={pharmacyForm.pharmacyName}
              onChange={(event) =>
                handleChangePharmacyForm('pharmacyName', event.target.value)
              }
              placeholder="예: 메디노트 약국"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600">
              전화번호
            </label>
            <Input
              value={pharmacyForm.phone}
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
              value={pharmacyForm.address}
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
          <h3 className="text-sm font-bold text-slate-700">영업시간</h3>

          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {businessDays.map((day) => (
              <div
                key={day.label}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="font-semibold text-slate-800">{day.label}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={pharmacyForm[day.openKey]}
                    onChange={(event) =>
                      handleChangePharmacyForm(day.openKey, event.target.value)
                    }
                  />

                  <Input
                    type="time"
                    value={pharmacyForm[day.closeKey]}
                    onChange={(event) =>
                      handleChangePharmacyForm(day.closeKey, event.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleRegisterPharmacy}
            disabled={registerPharmacyMutation.isPending}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {registerPharmacyMutation.isPending
              ? '등록 중'
              : '약국 정보 등록'}
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <div>
            <h2 className="text-xl font-bold text-slate-900">재고 등록/수정</h2>

            <p className="mt-1 text-sm text-slate-500">
              약국에서 보유 중인 의약품 재고를 등록합니다.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">
                약국 HPID
              </label>
              <Input
                value={inventoryForm.pharmacyHpid || currentPharmacyHpid}
                onChange={(event) =>
                  handleChangeInventoryForm('pharmacyHpid', event.target.value)
                }
                placeholder="약국 등록 후 자동 입력됩니다"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                품목코드 itemSeq
              </label>
              <Input
                value={inventoryForm.itemSeq}
                onChange={(event) =>
                  handleChangeInventoryForm('itemSeq', event.target.value)
                }
                placeholder="예: 200001234"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                약 이름
              </label>
              <Input
                value={inventoryForm.itemName}
                onChange={(event) =>
                  handleChangeInventoryForm('itemName', event.target.value)
                }
                placeholder="예: 타이레놀정500mg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                제조사
              </label>
              <Input
                value={inventoryForm.companyName}
                onChange={(event) =>
                  handleChangeInventoryForm('companyName', event.target.value)
                }
                placeholder="예: 한국얀센"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                재고 수량
              </label>
              <Input
                type="number"
                value={inventoryForm.stockQuantity}
                onChange={(event) =>
                  handleChangeInventoryForm('stockQuantity', event.target.value)
                }
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitInventory}
                disabled={upsertInventoryMutation.isPending}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {upsertInventoryMutation.isPending
                  ? '저장 중'
                  : '재고 저장'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">재고 목록</h2>

              <p className="mt-1 text-sm text-slate-500">
                등록된 약국 재고를 확인하고 수정/삭제합니다.
              </p>
            </div>

            <Badge variant="blue">{inventories.length}건</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {isInventoryError ? (
              <div className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-600">
                재고 목록을 불러오지 못했습니다.
              </div>
            ) : isInventoryLoading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                재고 목록을 불러오는 중입니다.
              </div>
            ) : inventories.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                등록된 재고가 없습니다.
              </div>
            ) : (
              inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {inventory.itemName}
                        </p>

                        <Badge variant="green">
                          {inventory.stockQuantity}개
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {inventory.companyName || '제조사 미등록'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        itemSeq: {inventory.itemSeq} · HPID:{' '}
                        {inventory.pharmacyHpid}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditInventory(inventory)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteInventory(inventory.id)}
                        disabled={deleteInventoryMutation.isPending}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PharmPharmacyPage;