import { useMemo } from 'react';
import { Badge, Card } from '../../components/ui';
import {
  useAdminStats,
  useAdminUsers,
  usePendingPharmacists,
} from '../../features/admin/hooks';

function getRoleLabel(role?: string | null) {
  if (role === 'ADMIN') return '관리자';
  if (role === 'PHARMACIST') return '약사';
  return '일반 사용자';
}

function getStatusLabel(status?: string | null) {
  if (status === 'ACTIVE') return '활성';
  if (status === 'WAITING_APPROVAL') return '승인 대기';
  if (status === 'PENDING') return '대기';
  if (status === 'REJECTED') return '거절';
  return '상태 없음';
}

function getStatusBadge(status?: string | null) {
  if (status === 'ACTIVE') return 'green';
  if (status === 'WAITING_APPROVAL') return 'yellow';
  if (status === 'REJECTED') return 'red';
  return 'gray';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return value.slice(0, 16).replace('T', ' ');
}

function AdminDashboardPage() {
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

  const recentUsers = useMemo(() => {
    return [...adminUsers]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [adminUsers]);

  const activeUserCount = useMemo(() => {
    return adminUsers.filter((user) => user.status === 'ACTIVE').length;
  }, [adminUsers]);

  const waitingUserCount = useMemo(() => {
    return adminUsers.filter((user) => user.status === 'WAITING_APPROVAL')
      .length;
  }, [adminUsers]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Admin Dashboard</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          관리자 대시보드
        </h1>

        <p className="mt-2 text-slate-500">
          전체 회원 현황과 약사 승인 대기 현황을 확인합니다.
        </p>
      </div>

      {isAdminStatsError && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          관리자 통계를 불러오지 못했습니다. 관리자 권한과 로그인 상태를
          확인해주세요.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">전체 회원 수</p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isAdminStatsLoading
              ? '-'
              : `${adminStats?.totalUserCount ?? 0}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            일반 사용자, 약사, 관리자를 포함한 전체 계정입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">전체 약사 수</p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isAdminStatsLoading
              ? '-'
              : `${adminStats?.totalPharmacistCount ?? 0}명`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            가입 완료 또는 승인 대기 중인 약사 계정입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">승인 대기 약사</p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
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
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
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
                <div
                  key={pharmacist.userId}
                  className="rounded-2xl border border-slate-200 p-4"
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
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">회원 현황</h2>

              <p className="mt-1 text-sm text-slate-500">
                전체 회원 목록을 기준으로 상태를 요약합니다.
              </p>
            </div>

            <Badge variant="blue">{adminUsers.length}명</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">활성 계정</p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                {isAdminUsersLoading ? '-' : `${activeUserCount}명`}
              </p>
            </div>

            <div className="rounded-2xl bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-700">승인 대기</p>
              <p className="mt-2 text-2xl font-bold text-yellow-700">
                {isAdminUsersLoading ? '-' : `${waitingUserCount}명`}
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
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{user.username}</p>

                    <Badge variant="blue">{getRoleLabel(user.role)}</Badge>

                    <Badge variant={getStatusBadge(user.status)}>
                      {getStatusLabel(user.status)}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">{user.email}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    가입일: {formatDateTime(user.createdAt)}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
        관리자 대시보드는 회원 통계와 승인 대기 상태를 빠르게 확인하는
        요약 화면입니다. 약사 승인/거절은 약사 관리 화면에서 처리합니다.
      </div>
    </div>
  );
}

export default AdminDashboardPage;