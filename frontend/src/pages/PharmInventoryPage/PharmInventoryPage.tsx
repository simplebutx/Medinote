import { useMemo, useState } from 'react';

import { Badge, Card, Input } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useMedicineSearch,
  useMedicineSuggest,
} from '../../features/drug/hooks';
import type { MedicineSearchItem } from '../../features/drug/types/drug.types';
import {
  useDeletePharmacyInventory,
  useMyPharmacyInventory,
  useUpsertPharmacyInventory,
} from '../../features/pharmacy/hooks';
import type {
  PharmacyInventory,
} from '../../features/pharmacy/types';

const defaultInventoryForm = {
  pharmacyHpid: '',
  itemSeq: '',
  itemName: '',
  companyName: '',
  stockQuantity: 0,
};

function getInventoryId(inventory: PharmacyInventory) {
  return inventory.id ?? inventory.inventoryId ?? 0;
}

function getInventoryPharmacyHpid(inventory: PharmacyInventory) {
  return inventory.pharmacyHpid ?? inventory.pharmacy_hpid ?? '';
}

function getInventoryItemSeq(inventory: PharmacyInventory) {
  return inventory.itemSeq ?? inventory.item_seq ?? '';
}

function getInventoryItemName(inventory: PharmacyInventory) {
  return inventory.itemName ?? inventory.item_name ?? '약 이름 없음';
}

function getInventoryCompanyName(inventory: PharmacyInventory) {
  return inventory.companyName ?? inventory.company_name ?? '';
}

function getInventoryStockQuantity(inventory: PharmacyInventory) {
  return inventory.stockQuantity ?? inventory.stock_quantity ?? 0;
}

function getMedicineId(medicine: MedicineSearchItem) {
  return String(medicine.itemSeq ?? medicine.item_seq ?? '');
}

function getMedicineName(medicine: MedicineSearchItem) {
  return (
    medicine.itemName ??
    medicine.item_name ??
    medicine.medicineName ??
    medicine.drugName ??
    '약 이름 없음'
  );
}

function getMedicineCompanyName(medicine: MedicineSearchItem) {
  return (
    medicine.entpName ??
    medicine.entp_name ??
    medicine.companyName ??
    medicine.company_name ??
    ''
  );
}

function PharmInventoryPage() {

  const [inventoryForm, setInventoryForm] = useState(defaultInventoryForm);

  const [medicineKeyword, setMedicineKeyword] = useState('');
  const [committedMedicineKeyword, setCommittedMedicineKeyword] = useState('');

  const debouncedMedicineKeyword = useDebounce(medicineKeyword, 300);

  const isMedicineSuggestEnabled =
    debouncedMedicineKeyword.trim().length >= 2 &&
    !committedMedicineKeyword;

  const isMedicineSearchEnabled = committedMedicineKeyword.trim().length >= 2;

  const {
    data: medicineSuggestions = [],
    isLoading: isMedicineSuggestLoading,
  } = useMedicineSuggest(
    isMedicineSuggestEnabled ? debouncedMedicineKeyword : '',
  );

  const {
    data: medicineResults = [],
    isLoading: isMedicineSearchLoading,
    isError: isMedicineSearchError,
  } = useMedicineSearch(
    isMedicineSearchEnabled ? committedMedicineKeyword : '',
  );

  const shouldShowMedicineDropdown =
    medicineKeyword.trim().length >= 2 &&
    !inventoryForm.itemSeq;

  const [message, setMessage] = useState('');
  
  const {
    data: inventories = [],
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useMyPharmacyInventory();

  const upsertInventoryMutation = useUpsertPharmacyInventory();
  const deleteInventoryMutation = useDeletePharmacyInventory();

  const currentPharmacyHpid = useMemo(() => {
    return (
      inventoryForm.pharmacyHpid ||
      (inventories[0] ? getInventoryPharmacyHpid(inventories[0]) : '') ||
      ''
    );
  }, [inventoryForm.pharmacyHpid, inventories]);

  const totalStockQuantity = useMemo(() => {
    return inventories.reduce((sum, inventory) => {
      return sum + Number(getInventoryStockQuantity(inventory));
    }, 0);
  }, [inventories]);

  const handleChangeInventoryForm = (
    key: keyof typeof defaultInventoryForm,
    value: string,
  ) => {
    setInventoryForm((prev) => ({
      ...prev,
      [key]: key === 'stockQuantity' ? Number(value || 0) : value,
    }));
  };

  const handleSelectMedicineKeyword = (keyword: string) => {
    setMedicineKeyword(keyword);
    setCommittedMedicineKeyword(keyword);
  };

  const handleSelectMedicine = (medicine: MedicineSearchItem) => {
    const itemSeq = getMedicineId(medicine);
    const itemName = getMedicineName(medicine);
    const companyName = getMedicineCompanyName(medicine);

    setInventoryForm((prev) => ({
      ...prev,
      itemSeq,
      itemName,
      companyName,
    }));

    setMedicineKeyword(itemName);
    setCommittedMedicineKeyword('');
  };

  const handleSubmitInventory = async () => {
    setMessage('');

    const pharmacyHpid = inventoryForm.pharmacyHpid || currentPharmacyHpid;

    if (!pharmacyHpid.trim()) {
      setMessage('약국 등록 후 재고를 등록하거나 약국 HPID를 입력해주세요.');
      return;
    }

    if (!inventoryForm.itemSeq.trim() || !inventoryForm.itemName.trim()) {
      setMessage('약 검색 결과에서 재고로 등록할 약을 선택해주세요.');
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

    setMedicineKeyword('');
    setCommittedMedicineKeyword('');

    setMessage('약국 재고가 저장되었습니다.');
  };

  const handleEditInventory = (inventory: PharmacyInventory) => {
    setInventoryForm({
      pharmacyHpid: getInventoryPharmacyHpid(inventory),
      itemSeq: getInventoryItemSeq(inventory),
      itemName: getInventoryItemName(inventory),
      companyName: getInventoryCompanyName(inventory),
      stockQuantity: getInventoryStockQuantity(inventory),
    });

    setMedicineKeyword(getInventoryItemName(inventory));
    setCommittedMedicineKeyword('');

    setMessage('선택한 재고 정보를 수정할 수 있습니다.');
  };

  const handleDeleteInventory = async (inventoryId: number) => {
    setMessage('');

    if (!inventoryId) {
      setMessage('삭제할 재고 ID를 확인할 수 없습니다.');
      return;
    }

    await deleteInventoryMutation.mutateAsync(inventoryId);

    setMessage('약국 재고가 삭제되었습니다.');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist Inventory
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">재고 관리</h1>

        <p className="mt-2 text-slate-500">
          약국에서 보유 중인 의약품 재고를 조회하고 관리합니다.
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

      {/* <Card>
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
      </Card> */}

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
                약 검색
              </label>

              <Input
                value={medicineKeyword}
                onChange={(event) => {
                  setMedicineKeyword(event.target.value);
                  setCommittedMedicineKeyword('');
                  setInventoryForm((prev) => ({
                    ...prev,
                    itemSeq: '',
                    itemName: '',
                    companyName: '',
                  }));
                }}
                placeholder="약 이름을 검색하세요"
              />

              {shouldShowMedicineDropdown && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-xs font-semibold text-slate-500">
                      약 검색 결과
                    </p>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-2">
                    {isMedicineSuggestLoading && !committedMedicineKeyword && (
                      <div className="px-4 py-4 text-sm text-blue-700">
                        약 검색 결과를 불러오는 중입니다.
                      </div>
                    )}

                    {!committedMedicineKeyword &&
                      !isMedicineSuggestLoading &&
                      medicineSuggestions.length === 0 && (
                        <div className="px-4 py-4 text-sm text-slate-500">
                          검색 결과가 없습니다.
                        </div>
                      )}

                    {!committedMedicineKeyword &&
                      !isMedicineSuggestLoading &&
                      medicineSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSelectMedicineKeyword(suggestion)}
                          className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                        >
                          <p className="font-semibold text-slate-900">{suggestion}</p>
                          <p className="mt-1 text-xs text-slate-500">약</p>
                        </button>
                      ))}

                    {isMedicineSearchLoading && (
                      <div className="px-4 py-4 text-sm text-blue-700">
                        약 정보를 검색하고 있습니다.
                      </div>
                    )}

                    {isMedicineSearchError && (
                      <div className="px-4 py-4 text-sm text-red-700">
                        약 검색 결과를 불러오지 못했습니다.
                      </div>
                    )}

                    {!isMedicineSearchLoading &&
                      !isMedicineSearchError &&
                      committedMedicineKeyword &&
                      medicineResults.length === 0 && (
                        <div className="px-4 py-4 text-sm text-slate-500">
                          검색 결과가 없습니다.
                        </div>
                      )}

                    {!isMedicineSearchLoading &&
                      !isMedicineSearchError &&
                      medicineResults.map((medicine, index) => {
                        const itemSeq = getMedicineId(medicine) || String(index + 1);
                        const itemName = getMedicineName(medicine);
                        const companyName = getMedicineCompanyName(medicine);

                        return (
                          <button
                            key={`${itemSeq}-${itemName}`}
                            type="button"
                            onClick={() => handleSelectMedicine(medicine)}
                            className="block w-full px-4 py-3 text-left transition hover:bg-blue-50"
                          >
                            <p className="font-semibold text-slate-900">{itemName}</p>

                            <p className="mt-1 text-xs text-slate-500">
                              {companyName || '제조사 정보 없음'}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                품목코드 itemSeq
              </label>
              <Input
                value={inventoryForm.itemSeq}
                readOnly
                placeholder="약 선택 시 자동 입력됩니다"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                약 이름
              </label>
              <Input
                value={inventoryForm.itemName}
                readOnly
                placeholder="약 선택 시 자동 입력됩니다"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                제조사
              </label>
              <Input
                value={inventoryForm.companyName}
                readOnly
                placeholder="약 선택 시 자동 입력됩니다"
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
              inventories.map((inventory) => {
                const inventoryId = getInventoryId(inventory);
                const itemName = getInventoryItemName(inventory);
                const itemSeq = getInventoryItemSeq(inventory);
                const companyName = getInventoryCompanyName(inventory);
                const stockQuantity = getInventoryStockQuantity(inventory);
                const pharmacyHpid = getInventoryPharmacyHpid(inventory);

                return (
                  <div
                    key={`${inventoryId}-${itemSeq}`}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{itemName}</p>

                          <Badge variant="green">{stockQuantity}개</Badge>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {companyName || '제조사 미등록'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          itemSeq: {itemSeq || '-'} · HPID: {pharmacyHpid || '-'}
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
                          onClick={() => handleDeleteInventory(inventoryId)}
                          disabled={
                            deleteInventoryMutation.isPending || inventoryId === 0
                          }
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PharmInventoryPage;