import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge, Card, PharmInput } from '../../components/ui';
import type { CautionItem, CautionReason } from '../../features/user/types/caution.types';
import {
  useActiveConsultRooms,
  useCompletedConsultRooms,
  useConsultPatientInfo,
  usePendingConsultRooms,
} from '../../features/consult/hooks';
import type {
  ConsultPatientInfo,
  ConsultRoom,
  ConsultRoomStatus,
  PatientMedicationSchedule,
} from '../../features/consult/types';

function getConsultStatusLabel(status: ConsultRoomStatus) {
  if (status === 'PENDING') return '대기';
  if (status === 'MATCHED' || status === 'ACTIVE') return '진행 중';
  return '완료';
}

function getConsultStatusBadge(status: ConsultRoomStatus) {
  if (status === 'PENDING') return 'yellow';
  if (status === 'MATCHED' || status === 'ACTIVE') return 'blue';
  return 'green';
}

function getPatientKey(room: ConsultRoom) {
  return String(room.customerId ?? room.customId ?? room.customerName ?? room.roomId);
}

function getPatientName(room: ConsultRoom) {
  return room.customerName || `환자 #${room.customerId ?? room.customId ?? room.roomId}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'MALE') return '남성';
  if (gender === 'FEMALE') return '여성';
  return gender ?? '-';
}

function calcKoreanAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getPatientDisplayName(
  patientInfo: ConsultPatientInfo | null | undefined,
  selectedRoom: ConsultRoom | null,
) {
  return (
    patientInfo?.username ||
    patientInfo?.customerName ||
    selectedRoom?.customerName ||
    (selectedRoom ? getPatientName(selectedRoom) : '-')
  );
}

function getPatientHealthBadges(patientInfo: ConsultPatientInfo | null | undefined) {
  const badges: string[] = [];
  if (!patientInfo) return badges;
  if (patientInfo.isPregnant) badges.push('임신');
  if (patientInfo.isBreastfeeding) badges.push('수유');
  if (patientInfo.isSmoking) badges.push('흡연');
  if (patientInfo.isDrinking) badges.push('음주');
  if (patientInfo.isChild) badges.push('소아');
  if (patientInfo.isElderly) badges.push('고령');
  if (patientInfo.chronicDiseases?.length) badges.push(...patientInfo.chronicDiseases);
  return badges;
}

const DOSAGE_UNIT_LABEL: Record<string, string> = {
  TABLET: '정',
  CAPSULE: '캡슐',
  PACK: '포',
  ML: 'ml',
  MG: 'mg',
  DROP: '방울',
  OTHER: '',
};

function formatDosageUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  return DOSAGE_UNIT_LABEL[unit] ?? unit;
}

function getMedicationName(schedule: PatientMedicationSchedule): string {
  if (schedule.hospitalName) return `${schedule.hospitalName} 처방`;
  if (schedule.pharmacyName) return `${schedule.pharmacyName} 조제`;
  const medicines = schedule.medicines ?? [];
  if (medicines.length > 0) {
    const firstName = medicines[0].customMedicineName ?? schedule.customMedicineName ?? '복약 정보';
    if (medicines.length === 1) return firstName;
    return `${firstName} 외${medicines.length - 1}`;
  }
  return schedule.customMedicineName ?? '복약 정보';
}

function getMedicationPeriod(schedule: PatientMedicationSchedule): string {
  if (schedule.startDate && schedule.endDate) return `${schedule.startDate} ~ ${schedule.endDate}`;
  if (schedule.startDate) return `${schedule.startDate} ~`;
  return '-';
}

function isMedicationActive(schedule: PatientMedicationSchedule): boolean {
  const endDate = schedule.endDate;
  if (!endDate) return true;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end >= today;
}

// 주의 표시 헬퍼
const CAUTION_REASON_LABELS: Record<CautionReason, string> = {
  ALLERGY: '알레르기',
  SIDE_EFFECT: '부작용',
  DOCTOR_ADVICE: '의사 권고',
  PHARMACIST_ADVICE: '약사 권고',
  PERSONAL_AVOID: '개인 회피',
  OTHER: '기타',
};

function getCautionReasonLabel(reason: CautionReason): string {
  return CAUTION_REASON_LABELS[reason] ?? reason;
}

function getCautionName(caution: CautionItem): string {
  return caution.itemName ?? caution.ingredientName ?? '알 수 없음';
}

function PatientPage() {
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(() => {
    const id = searchParams.get('roomId');
    return id ? Number(id) : null;
  });

  useEffect(() => {
    const id = searchParams.get('roomId');
    if (id) setSelectedRoomId(Number(id));
  }, [searchParams]);

  const { data: pendingRooms = [], isLoading: isPendingRoomsLoading, isError: isPendingRoomsError } = usePendingConsultRooms();
  const { data: activeRooms = [], isLoading: isActiveRoomsLoading, isError: isActiveRoomsError } = useActiveConsultRooms();
  const { data: completedRooms = [], isLoading: isCompletedRoomsLoading, isError: isCompletedRoomsError } = useCompletedConsultRooms();

  const allRooms = useMemo(() => [...pendingRooms, ...activeRooms, ...completedRooms], [pendingRooms, activeRooms, completedRooms]);

  const patientRooms = useMemo(() => {
    const roomMap = new Map<string, ConsultRoom>();
    allRooms.forEach((room) => {
      const key = getPatientKey(room);
      const existing = roomMap.get(key);
      if (!existing) { roomMap.set(key, room); return; }
      if (new Date(room.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        roomMap.set(key, room);
      }
    });
    return Array.from(roomMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allRooms]);

  const filteredPatientRooms = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return patientRooms;
    return patientRooms.filter((room) =>
      getPatientName(room).toLowerCase().includes(q) ||
      String(room.customerId ?? room.customId ?? '').toLowerCase().includes(q)
    );
  }, [keyword, patientRooms]);

  const selectedRoom = useMemo(
    () => patientRooms.find((r) => r.roomId === selectedRoomId) ?? filteredPatientRooms[0] ?? null,
    [patientRooms, filteredPatientRooms, selectedRoomId]
  );

  const { data: patientInfo, isLoading: isPatientInfoLoading, isError: isPatientInfoError } =
    useConsultPatientInfo(selectedRoom?.roomId ?? null);

  const isLoading = isPendingRoomsLoading || isActiveRoomsLoading || isCompletedRoomsLoading;
  const isError   = isPendingRoomsError || isActiveRoomsError || isCompletedRoomsError;

  const patientHealthBadges = getPatientHealthBadges(patientInfo);

  const medicationSchedules = [...(patientInfo?.medicationSchedules ?? [])].sort(
    (a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')
  );
  const activeMedications = medicationSchedules.filter(isMedicationActive);
  const pastMedications   = medicationSchedules.filter((s) => !isMedicationActive(s));

  const selectedPatientConsultRooms = useMemo(() => {
    if (!selectedRoom) return [];
    const key = getPatientKey(selectedRoom);
    return allRooms
      .filter((r) => getPatientKey(r) === key)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allRooms, selectedRoom]);

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-700">환자 조회에 필요한 상담 목록을 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm text-red-600">상담 서버 실행 상태와 약사 권한을 확인해주세요.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">상담 환자</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{isLoading ? '-' : `${patientRooms.length}명`}</p>
          <p className="mt-2 text-sm text-slate-500">상담 이력이 있는 환자 기준으로 집계합니다.</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">선택 환자 복약</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">{isPatientInfoLoading ? '-' : `${medicationSchedules.length}건`}</p>
          <p className="mt-2 text-sm text-slate-500">선택한 환자의 등록된 복약 일정 수입니다.</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">선택 환자 상담</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">{selectedPatientConsultRooms.length}건</p>
          <p className="mt-2 text-sm text-slate-500">선택한 환자의 전체 상담 이력 건수입니다.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* 환자 목록 */}
        <Card>
          <div>
            <h2 className="text-xl font-bold text-slate-900">환자 목록</h2>
            <p className="mt-1 text-sm text-slate-500">상담 이력이 있는 환자를 검색합니다.</p>
          </div>
          <div className="mt-4">
            <PharmInput
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="환자명 또는 환자 ID 검색"
            />
          </div>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">환자 목록을 불러오는 중입니다.</div>
            ) : filteredPatientRooms.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">상담 이력이 있는 환자가 없습니다.</div>
            ) : (
              filteredPatientRooms.map((room) => {
                const isSelected = selectedRoom?.roomId === room.roomId;
                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => setSelectedRoomId(room.roomId)}
                    className={[
                      'block w-full rounded-2xl border p-4 text-left transition',
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{getPatientName(room)}</p>
                      <Badge variant={getConsultStatusBadge(room.status)}>{getConsultStatusLabel(room.status)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">최근 상담: {formatDateTime(room.createdAt)}</p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* 환자 상세 */}
        <Card>
          {selectedRoom ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {getPatientDisplayName(patientInfo, selectedRoom)}
                  </h2>
                  <Badge variant={getConsultStatusBadge(selectedRoom.status)}>
                    최근 상담 {getConsultStatusLabel(selectedRoom.status)}
                  </Badge>
                </div>
              </div>

              {isPatientInfoLoading ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">환자 상세 정보를 불러오는 중입니다.</div>
              ) : isPatientInfoError ? (
                <div className="rounded-2xl bg-red-50 p-8 text-center text-sm text-red-600">환자 상세 정보를 불러오지 못했습니다.</div>
              ) : (
                <>
                  {/* 환자 정보 / 건강 정보 / 알레르기·주의 성분 */}
                  <section className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-500">환자 정보</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>이름: {getPatientDisplayName(patientInfo, selectedRoom)}</p>
                        <p>성별: {getGenderLabel(patientInfo?.gender)}</p>
                        <p>
                          생년월일: {patientInfo?.birthDate ?? '-'}
                          {(() => { const age = calcKoreanAge(patientInfo?.birthDate); return age !== null ? ` (만 ${age}세)` : ''; })()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-500">건강 정보</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {patientHealthBadges.length === 0 ? (
                          <Badge variant="gray">특이사항 없음</Badge>
                        ) : (
                          patientHealthBadges.map((badge) => (
                            <Badge key={badge} variant="red">{badge}</Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-500">알레르기/주의 성분</h3>
                      <div className="mt-3">
                        {!patientInfo?.cautions || patientInfo.cautions.length === 0 ? (
                          <Badge variant="gray">해당 없음</Badge>
                        ) : (
                          <div className="space-y-2">
                            {patientInfo.cautions.map((caution) => (
                              <div key={caution.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold text-slate-700">{getCautionName(caution)}</span>
                                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-orange-700">
                                  {getCautionReasonLabel(caution.reason)}
                                </span>
                                {caution.memo && <span className="text-slate-400">{caution.memo}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 복약 이력 */}
                  <section className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">현재 복약 중</h3>
                      <div className={['mt-3 space-y-3', activeMedications.length > 2 ? 'max-h-[520px] overflow-y-auto pr-1' : ''].join(' ')}>
                        {activeMedications.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">현재 복약 중인 약이 없습니다.</div>
                        ) : (
                          activeMedications.map((schedule, i) => (
                            <div key={i} className="rounded-2xl bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900">{getMedicationName(schedule)}</p>
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">복약 중</span>
                              </div>
                              {schedule.medicines && schedule.medicines.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                  {schedule.medicines.map((medicine, mi) => (
                                    <li key={mi} className="text-sm text-slate-600">
                                      {medicine.customMedicineName ?? '-'}
                                      {medicine.dosageAmount != null && (
                                        <span className="ml-1 text-slate-400">{medicine.dosageAmount}{formatDosageUnit(medicine.dosageUnit)}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <p className="mt-2 text-xs text-slate-400">복용 기간: {getMedicationPeriod(schedule)}</p>
                              <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                                {schedule.hospitalName && <p>병원: {schedule.hospitalName}</p>}
                                {schedule.pharmacyName && <p>약국: {schedule.pharmacyName}</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">복약 이력</h3>
                      <div className={['mt-3 space-y-3', pastMedications.length > 2 ? 'max-h-[520px] overflow-y-auto pr-1' : ''].join(' ')}>
                        {pastMedications.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">복약 이력이 없습니다.</div>
                        ) : (
                          pastMedications.map((schedule, i) => (
                            <div key={i} className="rounded-2xl bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900">{getMedicationName(schedule)}</p>
                                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">완료</span>
                              </div>
                              {schedule.medicines && schedule.medicines.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                  {schedule.medicines.map((medicine, mi) => (
                                    <li key={mi} className="text-sm text-slate-600">
                                      {medicine.customMedicineName ?? '-'}
                                      {medicine.dosageAmount != null && (
                                        <span className="ml-1 text-slate-400">{medicine.dosageAmount}{formatDosageUnit(medicine.dosageUnit)}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <p className="mt-2 text-xs text-slate-400">복용 기간: {getMedicationPeriod(schedule)}</p>
                              <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                                {schedule.hospitalName && <p>병원: {schedule.hospitalName}</p>}
                                {schedule.pharmacyName && <p>약국: {schedule.pharmacyName}</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 상담 이력 */}
                  <section>
                    <h3 className="text-lg font-bold text-slate-900">상담 이력</h3>
                    <div className={['mt-3 space-y-3', selectedPatientConsultRooms.length > 4 ? 'max-h-[400px] overflow-y-auto pr-1' : ''].join(' ')}>
                      {selectedPatientConsultRooms.map((room) => (
                        <div key={room.roomId} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-slate-900">{room.firstMessage || '복약 상담 요청'}</p>
                            <Badge variant={getConsultStatusBadge(room.status)}>{getConsultStatusLabel(room.status)}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-slate-400">요청일시: {formatDateTime(room.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              환자 목록에서 환자를 선택해주세요.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PatientPage;
