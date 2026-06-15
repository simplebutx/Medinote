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
  {
    slotNumber: 1,
    muxPort: 3,
    sensorReady: false,
    distanceMm: null,
    pillPresent: false,
  },
  {
    slotNumber: 2,
    muxPort: 4,
    sensorReady: false,
    distanceMm: null,
    pillPresent: false,
  },
  {
    slotNumber: 3,
    muxPort: 6,
    sensorReady: false,
    distanceMm: null,
    pillPresent: false,
  },
  {
    slotNumber: 4,
    muxPort: 7,
    sensorReady: false,
    distanceMm: null,
    pillPresent: false,
  },
];

function formatDistance(distanceMm?: number | null) {
  return Number.isFinite(distanceMm) && Number(distanceMm) >= 0
    ? `${distanceMm} mm`
    : '-- mm';
}

function formatReceivedAt(receivedAt?: string | null) {
  if (!receivedAt) {
    return '수신 대기';
  }

  const date = new Date(receivedAt);

  if (Number.isNaN(date.getTime())) {
    return receivedAt;
  }

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
  return (assignment?.scheduleTimes ?? []).map((scheduleTime) => {
    return (
      scheduleTime.medicineName ||
      `등록 약 #${scheduleTime.medicationScheduleMedicineId ?? '-'}`
    );
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
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
    () =>
      new Map(
        (assignment?.slots ?? []).map((slot) => [slot.slotNumber, slot]),
      ),
    [assignment?.slots],
  );

  const sensorSlotsByNumber = useMemo(
    () =>
      new Map(
        (statusQuery.data?.slots ?? []).map((slot) => [
          slot.slotNumber,
          slot,
        ]),
      ),
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
    () =>
      slots.filter(
        (slot) => getAssignedMedicineNames(slot.assignment).length > 0,
      ),
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

    if (results.some((result) => result.isError)) {
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
      console.error('스마트 약통 감지 상태 변경 실패:', error);
      toast.error(
        getErrorMessage(error, '자동 복약 감지 상태를 변경하지 못했습니다.'),
      );
    }
  };

  const executeResetConnection = useCallback(async () => {
    try {
      await resetConnectionMutation.mutateAsync(activeDeviceId);
      await assignmentQuery.refetch();
      toast.success('스마트 약통 연결을 초기화했습니다.');
    } catch (error) {
      console.error('스마트 약통 연결 초기화 실패:', error);
      toast.error(
        getErrorMessage(error, '스마트 약통 연결을 초기화하지 못했습니다.'),
      );
    }
  }, [activeDeviceId, assignmentQuery, resetConnectionMutation]);

  const handleResetConnection = async () => {
    if (!assignment) {
      toast.error('초기화할 스마트 약통 연결 정보가 없습니다.');
      return;
    }

    const isConfirmed = window.confirm(
      '스마트 약통의 모든 슬롯 연결을 초기화하시겠습니까?',
    );

    if (!isConfirmed) {
      return;
    }

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

    const hasPresentPill = connectedSlots.some((slot) =>
      Boolean(slot.pillPresent),
    );

    if (hasPresentPill) {
      hasSeenPillAfterStartRef.current = true;
      dismissedEmptyCycleKeyRef.current = '';
      return;
    }

    if (
      !hasSeenPillAfterStartRef.current ||
      connectedSlots.length === 0 ||
      resetConnectionMutation.isPending
    ) {
      return;
    }

    const emptyCycleKey = connectedSlots
      .map((slot) => `${slot.slotNumber}:X`)
      .join('|');

    if (dismissedEmptyCycleKeyRef.current === emptyCycleKey) {
      return;
    }

    dismissedEmptyCycleKeyRef.current = emptyCycleKey;

    const shouldReset = window.confirm(
      '연결된 약통 칸이 모두 비었습니다. 복약이 끝난 것으로 보고 연결 초기화할까요?',
    );

    if (shouldReset) {
      void executeResetConnection();
    }
  }, [
    activeDeviceId,
    assignment?.activeDetection,
    connectedSlots,
    executeResetConnection,
    resetConnectionMutation.isPending,
  ]);

  const assignmentErrorMessage =
    assignmentQuery.isError &&
    !(
      axios.isAxiosError(assignmentQuery.error) &&
      assignmentQuery.error.response?.status === 404
    )
      ? getErrorMessage(
          assignmentQuery.error,
          '스마트 약통 연결 정보를 불러오지 못했습니다.',
        )
      : '';

  const apiConnected = healthQuery.data === 'smartpill-test-ok';
  const receivedAt = formatReceivedAt(statusQuery.data?.receivedAt);
  const lastEvent = statusQuery.data?.eventType || '대기';
  const buttonClickCount = statusQuery.data?.buttonClickCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Smart Pillbox</p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">스마트 약통</h1>

          <p className="mt-2 text-slate-500">
            4개 칸의 센서 상태와 연결된 처방 내역의 약을 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={apiConnected ? 'green' : 'red'}>
            {apiConnected ? 'API 연결됨' : 'API 연결 안 됨'}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="border border-slate-200"
            onClick={handleRefresh}
            disabled={
              healthQuery.isFetching ||
              statusQuery.isFetching ||
              devicesQuery.isFetching ||
              assignmentQuery.isFetching
            }
          >
            새로고침
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">버튼 횟수</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {buttonClickCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Arduino 버튼 누적 감지 횟수입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">마지막 이벤트</p>
          <p className="mt-3 break-all text-2xl font-bold text-slate-900">
            {lastEvent}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            시퀀스 {statusQuery.data?.sequence ?? '-'}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">마지막 수신</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{receivedAt}</p>
          <p className="mt-2 text-sm text-slate-500">
            2초마다 최신 센서 상태를 확인합니다.
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">연결된 약통</p>
              <p className="mt-2 font-bold text-slate-900">
                {assignment?.name || activeDeviceId}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">
                처방 내역 연결 칸
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {connectedSlotCount} / 4
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">
                자동 복약 감지
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {assignment?.activeDetection ? '측정 중' : '대기 중'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={assignment?.activeDetection ? 'secondary' : 'primary'}
              onClick={handleToggleDetection}
              disabled={!canControlDetection || isControlPending}
            >
              {assignment?.activeDetection ? '측정 중지' : '측정 시작'}
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

        {devicesQuery.data && devicesQuery.data.length > 1 && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <label className="text-sm font-semibold text-slate-600">
              스마트 약통 선택
            </label>
            <select
              value={activeDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {devicesQuery.data.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name || device.deviceId}
                </option>
              ))}
            </select>
          </div>
        )}

        {!assignment && !assignmentQuery.isLoading && !assignmentErrorMessage && (
          <p className="mt-4 text-sm text-amber-700">
            아직 연결된 처방 내역이 없습니다. 내 정보의 처방 내역에서 스마트
            약통 연결을 설정해주세요.
          </p>
        )}

        {assignmentErrorMessage && (
          <p className="mt-4 text-sm text-red-700">{assignmentErrorMessage}</p>
        )}
      </Card>

      {statusQuery.isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm text-red-700">
            {getErrorMessage(
              statusQuery.error,
              '스마트 약통 센서 상태를 불러오지 못했습니다.',
            )}
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {slots.map((slot) => {
          const pillPresent = Boolean(slot.pillPresent);
          const sensorReady = Boolean(slot.sensorReady);
          const medicineNames = getAssignedMedicineNames(slot.assignment);

          return (
            <Card
              key={slot.slotNumber}
              className={
                pillPresent
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-white'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {slot.slotNumber}번 칸
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PORT {slot.muxPort ?? '-'}
                  </p>
                </div>

                <Badge
                  variant={
                    !sensorReady ? 'gray' : pillPresent ? 'green' : 'yellow'
                  }
                >
                  {!sensorReady
                    ? '센서 대기'
                    : pillPresent
                      ? '약 있음'
                      : '비어 있음'}
                </Badge>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">
                    {formatTakeTime(slot.assignment?.takeTime)}
                  </p>

                  {medicineNames.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {medicineNames.map((medicineName, index) => (
                        <p
                          key={`${slot.slotNumber}-${medicineName}-${index}`}
                          className="truncate font-semibold text-slate-900"
                        >
                          {medicineName}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">연결 없음</p>
                  )}
                </div>

                <strong
                  className={[
                    'flex size-16 shrink-0 items-center justify-center rounded-full text-3xl font-black',
                    pillPresent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600',
                  ].join(' ')}
                >
                  {pillPresent ? 'O' : 'X'}
                </strong>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400">거리</p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {formatDistance(slot.distanceMm)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    연결 시간
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {formatTakeTime(slot.assignment?.takeTime)}
                  </p>
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
