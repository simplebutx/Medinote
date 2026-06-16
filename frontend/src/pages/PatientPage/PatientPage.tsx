import { useMemo, useState } from 'react';

import { Badge, Card, PharmInput } from '../../components/ui';
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

  if (patientInfo.chronicDiseases?.length) {
    badges.push(...patientInfo.chronicDiseases);
  }

  return badges;
}

function getMedicationName(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '복약 정보';
  const data = schedule as Record<string, unknown>;

  // 직접 등록한 약 이름
  if (data.customMedicineName) return String(data.customMedicineName);

  // medicines 배열에서 첫 번째 약 이름
  if (Array.isArray(data.medicines) && data.medicines.length > 0) {
    const first = data.medicines[0] as Record<string, unknown>;
    if (first?.customMedicineName) return String(first.customMedicineName);
  }

  return '복약 정보';
}

function getMedicationDosage(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '-';
  const data = schedule as Record<string, unknown>;

  const amount = data.dosageAmount;
  const unit = data.dosageUnit;

  if (amount != null && unit != null) return `${amount}${unit}`;
  if (amount != null) return String(amount);
  return '-';
}

function getMedicationFrequency(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '-';
  const data = schedule as Record<string, unknown>;

  if (data.timesPerDay != null) return `하루 ${data.timesPerDay}회`;
  return '-';
}

function getMedicationPeriod(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '-';
  const data = schedule as Record<string, unknown>;

  const startDate = data.startDate;
  const endDate = data.endDate;

  if (startDate && endDate) return `${String(startDate)} ~ ${String(endDate)}`;
  if (data.durationDays != null) return `${data.durationDays}일`;
  return '-';
}

function getMedicationSource(schedule: unknown): string | null {
  if (!schedule || typeof schedule !== 'object') return null;
  const data = schedule as Record<string, unknown>;

  if (data.hospitalName) return String(data.hospitalName);
  if (data.pharmacyName) return String(data.pharmacyName);
  return null;
}

function isMedicationActive(schedule: unknown): boolean {
  if (!schedule || typeof schedule !== 'object') return true;

  const data = schedule as Record<string, unknown>;

  // 명시적 boolean 필드 우선 확인
  if (typeof data.isActive === 'boolean') return data.isActive;
  if (typeof data.active === 'boolean') return data.active;
  if (typeof data.isCurrent === 'boolean') return data.isCurrent;

  // 상태 문자열 필드 확인
  const status = data.status ?? data.medicationStatus ?? data.scheduleStatus;
  if (status != null) {
    const s = String(status).toUpperCase();
    if (['COMPLETED', 'ENDED', 'EXPIRED', 'INACTIVE', 'DONE', 'PAST', 'HISTORY', 'FINISHED'].includes(s)) return false;
    if (['ACTIVE', 'ONGOING', 'CURRENT', 'IN_PROGRESS', 'TAKING'].includes(s)) return true;
  }

  // 종료일 기준 비교
  const endDate = data.endDate ?? data.end_date ?? data.endAt ?? data.end_at ?? data.scheduleEndDate;
  if (!endDate) return true;

  const end = new Date(String(endDate));
  if (Number.isNaN(end.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end >= today;
}

function PatientPage() {
  const [keyword, setKeyword] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const {
    data: pendingRooms = [],
    isLoading: isPendingRoomsLoading,
    isError: isPendingRoomsError,
  } = usePendingConsultRooms();

  const {
    data: activeRooms = [],
    isLoading: isActiveRoomsLoading,
    isError: isActiveRoomsError,
  } = useActiveConsultRooms();

  const {
    data: completedRooms = [],
    isLoading: isCompletedRoomsLoading,
    isError: isCompletedRoomsError,
  } = useCompletedConsultRooms();

  const allRooms = useMemo(() => {
    return [...pendingRooms, ...activeRooms, ...completedRooms];
  }, [pendingRooms, activeRooms, completedRooms]);

  const patientRooms = useMemo(() => {
    const roomMap = new Map<string, ConsultRoom>();

    allRooms.forEach((room) => {
      const key = getPatientKey(room);

      const existingRoom = roomMap.get(key);

      if (!existingRoom) {
        roomMap.set(key, room);
        return;
      }

      const existingTime = new Date(existingRoom.createdAt).getTime();
      const currentTime = new Date(room.createdAt).getTime();

      if (currentTime > existingTime) {
        roomMap.set(key, room);
      }
    });

    return Array.from(roomMap.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      return bTime - aTime;
    });
  }, [allRooms]);

  const filteredPatientRooms = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return patientRooms;
    }

    return patientRooms.filter((room) => {
      return (
        getPatientName(room).toLowerCase().includes(normalizedKeyword) ||
        String(room.customerId ?? room.customId ?? '')
          .toLowerCase()
          .includes(normalizedKeyword)
      );
    });
  }, [keyword, patientRooms]);

  const selectedRoom = useMemo(() => {
    return (
      patientRooms.find((room) => room.roomId === selectedRoomId) ??
      filteredPatientRooms[0] ??
      null
    );
  }, [patientRooms, filteredPatientRooms, selectedRoomId]);

  const {
    data: patientInfo,
    isLoading: isPatientInfoLoading,
    isError: isPatientInfoError,
  } = useConsultPatientInfo(selectedRoom?.roomId ?? null);

  const isLoading =
    isPendingRoomsLoading || isActiveRoomsLoading || isCompletedRoomsLoading;

  const isError =
    isPendingRoomsError || isActiveRoomsError || isCompletedRoomsError;

  const patientHealthBadges = getPatientHealthBadges(patientInfo);

  const medicationSchedules = patientInfo?.medicationSchedules ?? [];
  const activeMedications = medicationSchedules.filter(isMedicationActive);
  const pastMedications = medicationSchedules.filter((s) => !isMedicationActive(s));

  const selectedPatientConsultRooms = useMemo(() => {
    if (!selectedRoom) return [];

    const selectedPatientKey = getPatientKey(selectedRoom);

    return allRooms
      .filter((room) => getPatientKey(room) === selectedPatientKey)
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();

        return bTime - aTime;
      });
  }, [allRooms, selectedRoom]);

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            환자 조회에 필요한 상담 목록을 불러오지 못했습니다.
          </p>
          <p className="mt-1 text-sm text-red-600">
            상담 서버 실행 상태와 약사 권한을 확인해주세요.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">상담 환자</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {isLoading ? '-' : `${patientRooms.length}명`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            상담 이력이 있는 환자 기준으로 집계합니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">선택 환자 복약</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">
            {isPatientInfoLoading ? '-' : `${medicationSchedules.length}건`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            선택한 환자의 등록된 복약 일정 수입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">선택 환자 상담</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">
            {selectedPatientConsultRooms.length}건
          </p>
          <p className="mt-2 text-sm text-slate-500">
            선택한 환자의 전체 상담 이력 건수입니다.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <div>
            <h2 className="text-xl font-bold text-slate-900">환자 목록</h2>
            <p className="mt-1 text-sm text-slate-500">
              상담 이력이 있는 환자를 검색합니다.
            </p>
          </div>

          <div className="mt-4">
            <PharmInput
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="환자명 또는 환자 ID 검색"
            />
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                환자 목록을 불러오는 중입니다.
              </div>
            ) : filteredPatientRooms.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                상담 이력이 있는 환자가 없습니다.
              </div>
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
                      <p className="font-bold text-slate-900">
                        {getPatientName(room)}
                      </p>

                      <Badge variant={getConsultStatusBadge(room.status)}>
                        {getConsultStatusLabel(room.status)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      최근 상담: {formatDateTime(room.createdAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          {selectedRoom ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {getPatientDisplayName(patientInfo, selectedRoom)}
                    </h2>

                    <Badge variant={getConsultStatusBadge(selectedRoom.status)}>
                      최근 상담 {getConsultStatusLabel(selectedRoom.status)}
                    </Badge>
                  </div>

                </div>
              </div>

              {isPatientInfoLoading ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                  환자 상세 정보를 불러오는 중입니다.
                </div>
              ) : isPatientInfoError ? (
                <div className="rounded-2xl bg-red-50 p-8 text-center text-sm text-red-600">
                  환자 상세 정보를 불러오지 못했습니다.
                </div>
              ) : (
                <>
                  <section className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-500">
                        기본 정보
                      </h3>

                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>이름: {getPatientDisplayName(patientInfo, selectedRoom)}</p>
                        <p>성별: {getGenderLabel(patientInfo?.gender)}</p>
                        <p>
                          생년월일: {patientInfo?.birthDate ?? '-'}
                          {(() => {
                            const age = calcKoreanAge(patientInfo?.birthDate);
                            return age !== null ? ` (만 ${age}세)` : '';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-500">
                        건강 정보
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {patientHealthBadges.length === 0 ? (
                          <Badge variant="gray">특이사항 없음</Badge>
                        ) : (
                          patientHealthBadges.map((badge) => (
                            <Badge key={badge} variant="red">
                              {badge}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        현재 복약 중
                      </h3>

                      <div className="mt-3 space-y-3">
                        {activeMedications.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            현재 복약 중인 약이 없습니다.
                          </div>
                        ) : (
                          activeMedications.map((schedule, index) => (
                            <div key={index} className="rounded-2xl bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900">
                                  {getMedicationName(schedule)}
                                </p>
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  복약 중
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-500">
                                {getMedicationDosage(schedule)} · {getMedicationFrequency(schedule)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                복용 기간: {getMedicationPeriod(schedule)}
                              </p>
                              {getMedicationSource(schedule) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  처방처: {getMedicationSource(schedule)}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        복약 이력
                      </h3>

                      <div className="mt-3 space-y-3">
                        {pastMedications.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            복약 이력이 없습니다.
                          </div>
                        ) : (
                          pastMedications.map((schedule, index) => (
                            <div key={index} className="rounded-2xl bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900">
                                  {getMedicationName(schedule)}
                                </p>
                                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                  완료
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-500">
                                {getMedicationDosage(schedule)} · {getMedicationFrequency(schedule)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                복용 기간: {getMedicationPeriod(schedule)}
                              </p>
                              {getMedicationSource(schedule) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  처방처: {getMedicationSource(schedule)}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900">
                      상담 이력
                    </h3>

                    <div className="mt-3 space-y-3">
                      {selectedPatientConsultRooms.map((room) => (
                        <div
                          key={room.roomId}
                          className="rounded-2xl bg-slate-50 p-4"
                        >
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-slate-900">
                              {room.firstMessage || '복약 상담 요청'}
                            </p>

                            <Badge variant={getConsultStatusBadge(room.status)}>
                              {getConsultStatusLabel(room.status)}
                            </Badge>
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            요청일시: {formatDateTime(room.createdAt)}
                          </p>
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
