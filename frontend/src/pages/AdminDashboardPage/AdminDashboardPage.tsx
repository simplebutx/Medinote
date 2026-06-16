import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import {
  useAdminStats,
  useAdminUsers,
  useMedicineSyncStatus,
  usePendingPharmacists,
  useSyncMedicines,
} from '../../features/admin/hooks';
import type { MedicineSyncResult } from '../../features/admin/types/admin.types';


function getRoleLabel(role?: string | null) {
  if (role === 'ADMIN') return '관리자';
  if (role === 'PHARMACIST') return '약사';
  return '일반 사용자';
}

function getStatusLabel(role?: string | null, status?: string | null) {
  if (role === 'USER') {
    return status === 'ACTIVE' ? '활성' : '비활성';
  }

  if (role === 'PHARMACIST') {
    if (status === 'ACTIVE') return '승인 완료';
    if (status === 'WAITING_APPROVAL') return '승인 대기';
    if (status === 'PENDING') return '반려 / 재제출 대기';
    if (status === 'REJECTED') return '반려';
    return '상태 없음';
  }

  if (role === 'ADMIN') {
    return status === 'ACTIVE' ? '활성' : '비활성';
  }

  return status || '상태 없음';
}

function getStatusBadge(role?: string | null, status?: string | null) {
  if (status === 'ACTIVE') return 'green';

  if (role === 'PHARMACIST') {
    if (status === 'WAITING_APPROVAL') return 'yellow';
    if (status === 'PENDING' || status === 'REJECTED') return 'red';
  }

  return 'gray';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

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

function getAccountManagePath(role?: string | null) {
  if (role === 'PHARMACIST') {
    return '/admin/pharmacists';
  }

  return '/admin/members';
}

function AdminDashboardPage() {
  const navigate = useNavigate();

  const [medicineSyncMessage, setMedicineSyncMessage] = useState<string | null>(
    null,
  );

  const [medicineSyncResult, setMedicineSyncResult] =
    useState<MedicineSyncResult | null>(null);

  const {
    data: medicineSyncStatus,
    isLoading: isMedicineSyncStatusLoading,
    refetch: refetchMedicineSyncStatus,
  } = useMedicineSyncStatus();

  const syncMedicinesMutation = useSyncMedicines();

  const displayedMedicineSyncStatus = medicineSyncResult ?? medicineSyncStatus;

  const handleSyncMedicines = async () => {
    const isConfirmed = window.confirm(
      '약 DB를 최신 데이터로 갱신하시겠습니까? 갱신 중에는 시간이 걸릴 수 있습니다.',
    );

    if (!isConfirmed) {
      return;
    }

    try {
      await refetchMedicineSyncStatus();

      syncMedicinesMutation.mutate(undefined, {
        onSuccess: (data) => {
          if (typeof data === 'string') {
            const message = data || '약 DB 갱신이 완료되었습니다.';

            setMedicineSyncMessage(message);
            setMedicineSyncResult(null);
            toast.success(message);
            return;
          }

          const insertedCount = data?.insertedCount ?? 0;
          const updatedCount = data?.updatedCount ?? 0;
          const syncedIngredientItemCount = data?.syncedIngredientItemCount ?? 0;

          const message =
            data?.message ||
            `약 DB 갱신이 완료되었습니다. 신규 ${insertedCount}건, 수정 ${updatedCount}건, 성분 ${syncedIngredientItemCount}건을 반영했습니다.`;

          setMedicineSyncMessage(message);
          setMedicineSyncResult(data);
          toast.success('약 DB 갱신이 완료되었습니다.');
        },
        onError: (error) => {
          console.error('약 DB 갱신 실패:', error);
          setMedicineSyncMessage(null);
          setMedicineSyncResult(null);
          toast.error('약 DB 갱신에 실패했습니다.');
        },
      });
    } catch (error) {
      console.error('약 DB 상태 조회 실패:', error);
      toast.error('약 DB 상태 확인에 실패했습니다.');
    }
  };

  const {
    data: adminStats,
    isLoading: isAdminStatsLoading,
    isError: isAdminStatsError,
  } = useAdminStats();

  const {
    data: pendingPharmacists = [],
    isLoading: isPendingPharmacistsLoading,
    isError: isPendingPharmacistsError,
  } = usePendingPharmacists();

  const {
    data: adminUsers = [],
    isLoading: isAdminUsersLoading,
    isError: isAdminUsersError,
  } = useAdminUsers();

  const dashboardAccounts = useMemo(() => {
    return adminUsers.filter((user) => user.role !== 'ADMIN');
  }, [adminUsers]);

  const recentUsers = useMemo(() => {
    return [...dashboardAccounts]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [dashboardAccounts]);

  const activeAccountCount = useMemo(() => {
    return dashboardAccounts.filter((user) => user.status === 'ACTIVE').length;
  }, [dashboardAccounts]);

  const inactiveAccountCount = useMemo(() => {
    return dashboardAccounts.filter((user) => user.status !== 'ACTIVE').length;
  }, [dashboardAccounts]);

  return (
    <div className="space-y-6">
      {isAdminStatsError && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          관리자 통계를 불러오지 못했습니다. 관리자 권한과 로그인 상태를
          확인해주세요.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/admin/members')}
        >
          <p className="text-sm font-medium text-slate-500">전체 회원 수</p>

          <p className="mt-3 text-3xl font-bold text-slate-700">
            {isAdminStatsLoading ? '-' : `${adminStats?.totalUserCount ?? 0}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            전체 가입 계정 수입니다.
          </p>
        </Card>

        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/admin/pharmacists')}
        >
          <p className="text-sm font-medium text-slate-500">전체 약사 수</p>

          <p className="mt-3 text-3xl font-bold text-blue-600">
            {isAdminStatsLoading
              ? '-'
              : `${adminStats?.totalPharmacistCount ?? 0}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            가입 완료 또는 승인 대기 중인 약사 계정입니다.
          </p>
        </Card>

        <Card
          className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate('/admin/pharmacists')}
        >
          <p className="text-sm font-medium text-slate-500">승인 대기 약사</p>

          <p className={[
            'mt-3 text-3xl font-bold',
            (adminStats?.pendingPharmacistCount ?? 0) > 0
              ? 'text-yellow-500'
              : 'text-slate-400',
          ].join(' ')}>
            {isAdminStatsLoading
              ? '-'
              : `${adminStats?.pendingPharmacistCount ?? 0}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            관리자 승인이 필요한 약사 인증 요청입니다.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                약사 승인 대기
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                최근 승인 대기 중인 약사 인증 요청입니다.
              </p>
            </div>

            <Badge variant="yellow">{pendingPharmacists.length}건</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {isPendingPharmacistsLoading && (
              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                승인 대기 약사 목록을 불러오는 중입니다.
              </div>
            )}

            {isPendingPharmacistsError && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                승인 대기 약사 목록을 불러오지 못했습니다.
              </div>
            )}

            {!isPendingPharmacistsLoading &&
              !isPendingPharmacistsError &&
              pendingPharmacists.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  승인 대기 중인 약사가 없습니다.
                </div>
              )}

            {!isPendingPharmacistsLoading &&
              !isPendingPharmacistsError &&
              pendingPharmacists.slice(0, 4).map((pharmacist) => (
                <button
                  key={pharmacist.userId}
                  type="button"
                  onClick={() => navigate('/admin/pharmacists')}
                  className="block w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {pharmacist.username}
                    </p>

                    <Badge variant="yellow">승인 대기</Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {pharmacist.email}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    약국명: {pharmacist.docNumber || '-'} · 면허번호:{' '}
                    {pharmacist.licenseNumber || '-'}
                  </p>
                </button>
              ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">회원 현황</h2>

              <p className="mt-1 text-sm text-slate-500">
                계정 상태 요약 및 최근 가입 현황입니다.
              </p>
            </div>

            <Badge variant="gray">{dashboardAccounts.length}명</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">활성 계정</p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                {isAdminUsersLoading ? '-' : `${activeAccountCount}명`}
              </p>
            </div>

            <div className="rounded-2xl bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-700">비활성 / 대기 계정</p>
              <p className="mt-2 text-2xl font-bold text-yellow-700">
                {isAdminUsersLoading ? '-' : `${inactiveAccountCount}명`}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {isAdminUsersError && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                회원 목록을 불러오지 못했습니다.
              </div>
            )}

            {!isAdminUsersLoading &&
              !isAdminUsersError &&
              recentUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => navigate(getAccountManagePath(user.role))}
                  className="block w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{user.username}</p>

                    <Badge variant="gray">{getRoleLabel(user.role)}</Badge>

                    <Badge variant={getStatusBadge(user.role, user.status)}>
                      {getStatusLabel(user.role, user.status)}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">{user.email}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    가입일: {formatDateTime(user.createdAt)}
                  </p>
                </button>
              ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">약 DB 갱신</h2>

                <p className="mt-2 text-sm text-slate-500">
                  약 정보 데이터를 최신 상태로 동기화합니다. 갱신 중에는 시간이 걸릴 수 있습니다.
                </p>

                {medicineSyncMessage && (
                  <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-700">
                    {medicineSyncMessage}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="slate"
                onClick={handleSyncMedicines}
                disabled={
                  syncMedicinesMutation.isPending || isMedicineSyncStatusLoading
                }
                className="shrink-0"
              >
                {syncMedicinesMutation.isPending ? '갱신 중...' : '약 DB 갱신'}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">현재 DB 반영 날짜</p>
                <p className="mt-2 font-bold text-slate-900">
                  {isMedicineSyncStatusLoading
                    ? '-'
                    : displayedMedicineSyncStatus?.lastSyncedPublicUpdateDe || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">공공데이터 최신 수정일</p>
                <p className="mt-2 font-bold text-slate-900">
                  {isMedicineSyncStatusLoading
                    ? '-'
                    : displayedMedicineSyncStatus?.latestPublicUpdateDe || '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">확인한 날짜 수</p>
                <p className="mt-2 font-bold text-slate-900">
                  {isMedicineSyncStatusLoading
                    ? '-'
                    : `${displayedMedicineSyncStatus?.requestedDateCount ?? 0}일`}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}

export default AdminDashboardPage;