import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Card } from '../../components/ui';
import {
  useActiveConsultRooms,
  useCompletedConsultRooms,
  usePendingConsultRooms,
} from '../../features/consult/hooks';
import type { ConsultRoom, ConsultRoomStatus } from '../../features/consult/types';

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

function getPatientName(room: ConsultRoom) {
  return room.customerName || `환자 #${room.customerId ?? room.customId ?? room.roomId}`;
}

function getConsultTitle(room: ConsultRoom) {
  return room.firstMessage || '복약 상담 요청';
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

function PharmDashboardPage() {
  const navigate = useNavigate();

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

  const isLoading =
    isPendingRoomsLoading || isActiveRoomsLoading || isCompletedRoomsLoading;

  const isError =
    isPendingRoomsError || isActiveRoomsError || isCompletedRoomsError;

  const recentRooms = useMemo(() => {
    return [...pendingRooms, ...activeRooms, ...completedRooms]
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [pendingRooms, activeRooms, completedRooms]);

  const patientCount = useMemo(() => {
    const patientKeys = new Set<string>();

    [...pendingRooms, ...activeRooms, ...completedRooms].forEach((room) => {
      const patientKey =
        room.customerId ?? room.customId ?? room.customerName ?? room.roomId;

      patientKeys.add(String(patientKey));
    });

    return patientKeys.size;
  }, [pendingRooms, activeRooms, completedRooms]);

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            상담 정보를 불러오지 못했습니다.
          </p>
          <p className="mt-1 text-sm text-red-600">
            상담 서버 실행 상태와 로그인 토큰을 확인해주세요.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/pharmacist/consults')}
        >
          <p className="text-sm font-medium text-slate-500">상담 대기</p>

          <p className="mt-3 text-3xl font-bold text-yellow-500">
            {isLoading ? '-' : `${pendingRooms.length}건`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            아직 답변이 필요한 상담 요청입니다.
          </p>
        </Card>

        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/pharmacist/consults')}
        >
          <p className="text-sm font-medium text-slate-500">진행 중 상담</p>

          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {isLoading ? '-' : `${activeRooms.length}건`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            확인 또는 답변 작성 중인 상담입니다.
          </p>
        </Card>

        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/pharmacist/patients')}
        >
          <p className="text-sm font-medium text-slate-500">상담 환자</p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isLoading ? '-' : `${patientCount}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            상담 이력이 있는 환자 기준으로 집계합니다.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                최근 상담 요청
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                최근 접수되거나 처리된 상담 요청 일부를 표시합니다.
              </p>
            </div>

            <Badge variant="yellow">{pendingRooms.length}건 대기</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                상담 정보를 불러오는 중입니다.
              </div>
            ) : recentRooms.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                표시할 상담 요청이 없습니다.
              </div>
            ) : (
              recentRooms.map((room) => (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => navigate('/pharmacist/consults')}
                  className="block w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {getPatientName(room)}
                    </p>

                    <Badge variant={getConsultStatusBadge(room.status)}>
                      {getConsultStatusLabel(room.status)}
                    </Badge>
                  </div>

                  <p className="mt-2 truncate text-slate-800">
                    {getConsultTitle(room)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    요청일시: {formatDateTime(room.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">상담 현황</h2>

              <p className="mt-1 text-sm text-slate-500">
                현재 약사 계정 기준 상담 상태를 요약합니다.
              </p>
            </div>

            <Badge variant="green">
              총 {pendingRooms.length + activeRooms.length + completedRooms.length}건
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-yellow-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-yellow-700">상담 대기</p>
                <p className="text-lg font-bold text-yellow-600">
                  {pendingRooms.length}건
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-emerald-700">진행 중</p>
                <p className="text-lg font-bold text-emerald-600">
                  {activeRooms.length}건
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-600">완료</p>
                <p className="text-lg font-bold text-slate-700">
                  {completedRooms.length}건
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Quick Access</p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              약사 업무 바로가기
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              상담 관리, 환자 조회, 약 검색 화면으로 빠르게 이동할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/pharmacist/consults')}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              상담 관리
            </button>

            <button
              type="button"
              onClick={() => navigate('/pharmacist/patients')}
              className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              환자 조회
            </button>

            <button
              type="button"
              onClick={() => navigate('/pharmacist/drugs')}
              className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              약 검색
            </button>

            <button
              type="button"
              onClick={() => navigate('/pharmacist/inventory')}
              className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              재고 관리
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PharmDashboardPage;
