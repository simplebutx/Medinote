import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge, Button, Card } from '../../components/ui';
import {
  usePauseSmartPillDetection,
  useResetSmartPillConnection,
  useSmartPillDevices,
  useSmartPillHealth,
  useSmartPillSlotAssignments,
  useSmartPillStatus,
  useStartSmartPillDetection,
} from '../../features/smartpill/hooks';
import type {
  SmartPillSlotAssignment,
  SmartPillSlotState,
} from '../../features/smartpill/types/smartpill.types';

const DEFAULT_DEVICE_ID = 'smartpill-prototype-1';

const DEFAULT_SLOTS: SmartPillSlotState[] = [
  { slotNumber: 1, muxPort: 3, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 2, muxPort: 4, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 3, muxPort: 6, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 4, muxPort: 7, sensorReady: false, distanceMm: null, pillPresent: false },
];

function formatDistance(distanceMm?: number | null) {
  return Number.isFinite(distanceMm) && Number(distanceMm) >= 0
    ? `${distanceMm} mm`
    : '-- mm';
}

function formatReceivedAt(receivedAt?: string | null) {
  if (!receivedAt) return '수신 대기';
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) return receivedAt;
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatTakeTime(takeTime?: string | null) {
  return takeTime ? takeTime.slice(0, 5) : '시간 미설정';
}

function getAssignedMedicineNames(assignment?: SmartPillSlotAssignment | null) {
  return (assignment?.scheduleTimes ?? []).map((scheduleTime) =>
    scheduleTime.medicineName ||
    `등록 약 #${scheduleTime.medicationScheduleMedicineId ?? '-'}`,
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function IotPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const hasSeenPillAfterStartRef = useRef(false);
  const dismissedEmptyCycleKeyRef = useRef('');
  const observedDeviceIdRef = useRef<string | null>(null);

  const healthQuery = useSmartPillHealth();
  const statusQuery = useSmartPillStatus();
  const devicesQuery = useSmartPillDevices();

  const sensorDeviceId =
    statusQuery.data?.deviceId && statusQuery.data.deviceId !== 'empty'
      ? statusQuery.data.deviceId
      : null;

  const activeDeviceId =
    selectedDeviceId ||
    devicesQuery.data?.[0]?.deviceId ||
    sensorDeviceId ||
    DEFAULT_DEVICE_ID;

  const assignmentQuery = useSmartPillSlotAssignments(activeDeviceId);
  const startDetectionMutation = useStartSmartPillDetection();
  const pauseDetectionMutation = usePauseSmartPillDetection();
  const resetConnectionMutation = useResetSmartPillConnection();

  const assignment =
    assignmentQuery.isError &&
    axios.isAxiosError(assignmentQuery.error) &&
    assignmentQuery.error.response?.status === 404
      ? null
      : assignmentQuery.data;

  const assignmentsBySlot = useMemo(
    () => new Map((assignment?.slots ?? []).map((slot) => [slot.slotNumber, slot])),
    [assignment?.slots],
  );

  const sensorSlotsByNumber = useMemo(
    () => new Map((statusQuery.data?.slots ?? []).map((slot) => [slot.slotNumber, slot])),
    [statusQuery.data?.slots],
  );

  const slots = useMemo(
    () =>
      DEFAULT_SLOTS.map((fallback) => ({
        ...fallback,
        ...sensorSlotsByNumber.get(fallback.slotNumber),
        assignment: assignmentsBySlot.get(fallback.slotNumber) ?? null,
      })),
    [assignmentsBySlot, sensorSlotsByNumber],
  );

  const connectedSlots = useMemo(
    () => slots.filter((slot) => getAssignedMedicineNames(slot.assignment).length > 0),
    [slots],
  );

  const connectedSlotCount = connectedSlots.length;
  const isControlPending =
    startDetectionMutation.isPending ||
    pauseDetectionMutation.isPending ||
    resetConnectionMutation.isPending;
  const canControlDetection = Boolean(assignment && connectedSlotCount > 0);

  const handleRefresh = async () => {
    const results = await Promise.all([
      healthQuery.refetch(),
      statusQuery.refetch(),
      devicesQuery.refetch(),
      assignmentQuery.refetch(),
    ]);
    if (results.some((r) => r.isError)) {
      toast.error('일부 스마트 약통 정보를 새로고침하지 못했습니다.');
      return;
    }
    toast.success('스마트 약통 정보를 새로고침했습니다.');
  };

  const handleToggleDetection = async () => {
    if (!assignment) {
      toast.error('내 정보에서 처방 내역을 스마트 약통에 먼저 연결해주세요.');
      return;
    }
    try {
      if (assignment.activeDetection) {
        await pauseDetectionMutation.mutateAsync(activeDeviceId);
        toast.success('자동 복약 감지를 중지했습니다.');
      } else {
        await startDetectionMutation.mutateAsync(activeDeviceId);
        toast.success('자동 복약 감지를 시작했습니다.');
      }
      await assignmentQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, '자동 복약 감지 상태를 변경하지 못했습니다.'));
    }
  };

  const executeResetConnection = useCallback(async () => {
    try {
      await resetConnectionMutation.mutateAsync(activeDeviceId);
      await assignmentQuery.refetch();
      toast.success('스마트 약통 연결을 초기화했습니다.');
    } catch (error) {
      toast.error(getErrorMessage(error, '스마트 약통 연결을 초기화하지 못했습니다.'));
    }
  }, [activeDeviceId, assignmentQuery, resetConnectionMutation]);

  const handleResetConnection = async () => {
    if (!assignment) {
      toast.error('초기화할 스마트 약통 연결 정보가 없습니다.');
      return;
    }
    if (!window.confirm('스마트 약통의 모든 슬롯 연결을 초기화하시겠습니까?')) return;
    await executeResetConnection();
  };

  useEffect(() => {
    if (observedDeviceIdRef.current !== activeDeviceId) {
      observedDeviceIdRef.current = activeDeviceId;
      hasSeenPillAfterStartRef.current = false;
      dismissedEmptyCycleKeyRef.current = '';
    }
    if (!assignment?.activeDetection) {
      hasSeenPillAfterStartRef.current = false;
      dismissedEmptyCycleKeyRef.current = '';
      return;
    }
    const hasPresentPill = connectedSlots.some((slot) => Boolean(slot.pillPresent));
    if (hasPresentPill) {
      hasSeenPillAfterStartRef.current = true;
      dismissedEmptyCycleKeyRef.current = '';
      return;
    }
    if (!hasSeenPillAfterStartRef.current || connectedSlots.length === 0 || resetConnectionMutation.isPending) return;
    const emptyCycleKey = connectedSlots.map((slot) => `${slot.slotNumber}:X`).join('|');
    if (dismissedEmptyCycleKeyRef.current === emptyCycleKey) return;
    dismissedEmptyCycleKeyRef.current = emptyCycleKey;
    if (window.confirm('연결된 약통 칸이 모두 비었습니다. 복약이 끝난 것으로 보고 연결 초기화할까요?')) {
      void executeResetConnection();
    }
  }, [activeDeviceId, assignment?.activeDetection, connectedSlots, executeResetConnection, resetConnectionMutation.isPending]);

  const assignmentErrorMessage =
    assignmentQuery.isError &&
    !(axios.isAxiosError(assignmentQuery.error) && assignmentQuery.error.response?.status === 404)
      ? getErrorMessage(assignmentQuery.error, '스마트 약통 연결 정보를 불러오지 못했습니다.')
      : '';

  const apiConnected = healthQuery.data === 'smartpill-test-ok';
  const receivedAt = formatReceivedAt(statusQuery.data?.receivedAt);
  const lastEvent = statusQuery.data?.eventType || '대기';
  const buttonClickCount = statusQuery.data?.buttonClickCount ?? 0;
  const isDetecting = Boolean(assignment?.activeDetection);

  return (
    <div className="space-y-6">
      {/* ── 상태 스트립 ── */}
      <div className="flex flex-wrap gap-2">
        {/* API 연결 상태 */}
        <div className={[
          'flex items-center gap-2 rounded-xl border px-4 py-2.5',
          apiConnected
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-200 bg-red-50',
        ].join(' ')}>
          <span className={['h-2.5 w-2.5 rounded-full', apiConnected ? 'bg-emerald-500' : 'bg-red-500'].join(' ')} />
          <span className={['text-sm font-semibold', apiConnected ? 'text-emerald-700' : 'text-red-700'].join(' ')}>
            {apiConnected ? 'API 연결됨' : 'API 연결 안 됨'}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-xs text-slate-400">마지막 수신</span>
          <span className="text-sm font-semibold text-slate-800">{receivedAt}</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-xs text-slate-400">이벤트</span>
          <span className="text-sm font-semibold text-slate-800">{lastEvent}</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-xs text-slate-400">버튼 감지</span>
          <span className="text-sm font-semibold text-slate-800">{buttonClickCount}회</span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={
            healthQuery.isFetching ||
            statusQuery.isFetching ||
            devicesQuery.isFetching ||
            assignmentQuery.isFetching
          }
          className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          새로고침
        </button>
      </div>

      {/* ── 기기 제어 카드 ── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          {/* 기기 정보 */}
          <div className="flex items-center gap-5">
            <div>
              <p className="text-xs font-semibold text-slate-400">연결된 약통</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {assignment?.name || activeDeviceId}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs font-semibold text-slate-400">처방 연결 슬롯</p>
              <p className="mt-0.5 font-bold text-slate-900">{connectedSlotCount} / 4</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs font-semibold text-slate-400">자동 감지</p>
              <p className={['mt-0.5 font-bold', isDetecting ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
                {isDetecting ? '측정 중' : '대기 중'}
              </p>
            </div>
          </div>

          {/* 제어 버튼 */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isDetecting ? 'secondary' : 'primary'}
              onClick={handleToggleDetection}
              disabled={!canControlDetection || isControlPending}
            >
              {isDetecting ? '측정 중지' : '측정 시작'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={handleResetConnection}
              disabled={!canControlDetection || isControlPending}
            >
              연결 초기화
            </Button>
          </div>
        </div>

        {/* 약통 선택 (복수 기기) */}
        {devicesQuery.data && devicesQuery.data.length > 1 && (
          <div className="border-t border-slate-100 px-5 py-4">
            <label className="text-xs font-semibold text-slate-500">약통 선택</label>
            <select
              value={activeDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {devicesQuery.data.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name || device.deviceId}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 안내/오류 메시지 */}
        {!assignment && !assignmentQuery.isLoading && !assignmentErrorMessage && (
          <div className="border-t border-slate-100 bg-amber-50 px-5 py-3">
            <p className="text-sm text-amber-700">
              아직 연결된 처방 내역이 없습니다. 내 정보의 처방 내역에서 스마트 약통 연결을 설정해주세요.
            </p>
          </div>
        )}
        {assignmentErrorMessage && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-3">
            <p className="text-sm text-red-700">{assignmentErrorMessage}</p>
          </div>
        )}
        {statusQuery.isError && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-3">
            <p className="text-sm text-red-700">
              {getErrorMessage(statusQuery.error, '스마트 약통 센서 상태를 불러오지 못했습니다.')}
            </p>
          </div>
        )}
      </Card>

      {/* ── 슬롯 그리드 ── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {slots.map((slot) => {
          const pillPresent = Boolean(slot.pillPresent);
          const sensorReady = Boolean(slot.sensorReady);
          const medicineNames = getAssignedMedicineNames(slot.assignment);
          const hasAssignment = medicineNames.length > 0;

          return (
            <Card
              key={slot.slotNumber}
              className={[
                'flex flex-col gap-0 p-0 overflow-hidden transition-all',
                pillPresent ? 'border-emerald-300' : '',
              ].join(' ')}
            >
              {/* 슬롯 상단 컬러 바 */}
              <div className={[
                'h-1.5 w-full',
                pillPresent ? 'bg-emerald-400' : sensorReady ? 'bg-slate-200' : 'bg-slate-100',
              ].join(' ')} />

              <div className="p-5">
                {/* 헤더 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={[
                      'flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold text-white',
                      pillPresent ? 'bg-emerald-500' : 'bg-slate-300',
                    ].join(' ')}>
                      {slot.slotNumber}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {slot.slotNumber}번 슬롯
                    </span>
                  </div>

                  <Badge variant={!sensorReady ? 'gray' : pillPresent ? 'green' : 'yellow'}>
                    {!sensorReady ? '센서 대기' : pillPresent ? '약 있음' : '비어 있음'}
                  </Badge>
                </div>

                {/* 처방 내역 */}
                <div className="mt-4 min-h-[56px]">
                  {hasAssignment ? (
                    <>
                      <p className="text-xs font-semibold text-slate-400">
                        {formatTakeTime(slot.assignment?.takeTime)} 복용
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {medicineNames.map((name, i) => (
                          <p
                            key={`${slot.slotNumber}-${name}-${i}`}
                            className="truncate text-sm font-semibold text-slate-900"
                          >
                            {name}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">처방 내역 미연결</p>
                  )}
                </div>

                {/* 센서 데이터 */}
                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-400">감지 거리</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                      {formatDistance(slot.distanceMm)}
                    </p>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={[
                      'h-2 w-2 rounded-full',
                      pillPresent ? 'bg-emerald-500' : sensorReady ? 'bg-slate-300' : 'bg-slate-200',
                    ].join(' ')} />
                    <span className="text-xs text-slate-500">
                      {pillPresent ? '약 감지됨' : sensorReady ? '비어 있음' : '센서 준비 중'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default IotPage;
