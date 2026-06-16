import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '../../components/ui';
import {
  useAdminUsers,
  useApprovePharmacist,
  usePendingPharmacists,
  useRejectPharmacist,
} from '../../features/admin/hooks';
import type { AdminUser } from '../../features/admin/types/admin.types';

type PharmacistTab = 'PENDING' | 'APPROVED' | 'REJECTED';

const tabs: { key: PharmacistTab; label: string }[] = [
  { key: 'PENDING', label: '승인 대기' },
  { key: 'APPROVED', label: '승인 완료' },
  { key: 'REJECTED', label: '반려' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return value.slice(0, 16).replace('T', ' ');
}

function PharmacistManagePage() {
  const [activeTab, setActiveTab] = useState<PharmacistTab>('PENDING');

  const {
    data: pendingPharmacists = [],
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = usePendingPharmacists();

  const {
    data: adminUsers = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useAdminUsers();

  const approvePharmacistMutation = useApprovePharmacist();
  const rejectPharmacistMutation = useRejectPharmacist();

  const approvedPharmacists = useMemo(() => {
    return adminUsers.filter(
      (user) => user.role === 'PHARMACIST' && user.status === 'ACTIVE',
    );
  }, [adminUsers]);

  const rejectedPharmacists = useMemo(() => {
    return adminUsers.filter(
      (user) =>
        user.role === 'PHARMACIST' &&
        (user.status === 'REJECTED' || user.status === 'PENDING'),
    );
  }, [adminUsers]);

  const isProcessing =
    approvePharmacistMutation.isPending || rejectPharmacistMutation.isPending;

  const isLoading =
    activeTab === 'PENDING' ? isPendingLoading : isUsersLoading;

  const isError = activeTab === 'PENDING' ? isPendingError : isUsersError;

  const handleApprovePharmacist = (userId: number) => {
    const isConfirmed = window.confirm('이 약사 인증 요청을 승인하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    approvePharmacistMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('약사 인증 요청을 승인했습니다.');
      },
      onError: (error) => {
        console.error('약사 승인 실패:', error);
        toast.error('약사 승인에 실패했습니다.');
      },
    });
  };

  const handleRejectPharmacist = (userId: number) => {
    const isConfirmed = window.confirm('이 약사 인증 요청을 거절하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    rejectPharmacistMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('약사 인증 요청을 거절했습니다.');
      },
      onError: (error) => {
        console.error('약사 거절 실패:', error);
        toast.error('약사 거절에 실패했습니다.');
      },
    });
  };

  const renderTabBadge = (tabKey: PharmacistTab) => {
    if (tabKey === 'PENDING') return pendingPharmacists.length;
    if (tabKey === 'APPROVED') return approvedPharmacists.length;
    return rejectedPharmacists.length;
  };

  const getStatusLabel = (status?: string | null) => {
    if (status === 'ACTIVE') return '승인 완료';
    if (status === 'WAITING_APPROVAL') return '승인 대기';
    if (status === 'REJECTED') return '반려';
    if (status === 'PENDING') return '반려 / 재제출 대기';

    return status || '-';
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return <Badge variant="green">승인 완료</Badge>;
    }

    if (status === 'WAITING_APPROVAL') {
      return <Badge variant="yellow">승인 대기</Badge>;
    }

    if (status === 'REJECTED') {
      return <Badge variant="red">반려</Badge>;
    }

    if (status === 'PENDING') {
      return <Badge variant="red">반려 / 재제출 대기</Badge>;
    }

    return <Badge variant="gray">{status}</Badge>;
  };

  const renderAdminUserItem = (user: AdminUser) => {
    return (
      <div key={user.id} className="rounded-2xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-900">
            {user.username || '이름 정보 없음'}
          </p>
          {renderStatusBadge(user.status)}
        </div>
        <p className="mt-1 text-sm text-slate-500">{user.email || '-'}</p>
        <p className="mt-1 text-sm text-slate-500">
          소속 약국: {user.docNumber || '-'} · 면허번호: {user.licenseNumber || '-'}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          가입일: {formatDateTime(user.createdAt)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              약사 인증 관리
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              승인 대기, 승인 완료, 반려 상태의 약사 계정을 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  activeTab === tab.key
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {tab.label} {renderTabBadge(tab.key)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="rounded-2xl bg-slate-100 p-5 text-sm text-slate-600">
          약사 목록을 불러오는 중입니다.
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
          약사 목록을 불러오지 못했습니다. 관리자 권한과 로그인 상태를
          확인해주세요.
        </div>
      )}

      {!isLoading && !isError && activeTab === 'PENDING' && (
        <>
          {pendingPharmacists.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              승인 대기 중인 약사 인증 요청이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPharmacists.map((pharmacist) => (
                <Card key={pharmacist.userId}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {pharmacist.username || '이름 정보 없음'}
                        </h2>

                        <Badge variant="yellow">승인 대기</Badge>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <div className="flex-1 rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">이메일</p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {pharmacist.email || '-'}
                          </p>
                        </div>

                        <div className="flex-1 rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">소속 약국명</p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {pharmacist.docNumber || '-'}
                          </p>
                        </div>

                        <div className="flex-1 rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">면허 번호</p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {pharmacist.licenseNumber || '-'}
                          </p>
                        </div>

                        <div className="flex-1 rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">면허증</p>
                          {pharmacist.licenseImage ? (
                            <a
                              href={pharmacist.licenseImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block font-semibold text-blue-600 underline-offset-2 hover:underline"
                            >
                              확인하기
                            </a>
                          ) : (
                            <p className="mt-2 font-semibold text-slate-900">-</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="border border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() =>
                          handleRejectPharmacist(pharmacist.userId)
                        }
                        disabled={isProcessing}
                      >
                        거절
                      </Button>

                      <Button
                        type="button"
                        variant="slate"
                        onClick={() =>
                          handleApprovePharmacist(pharmacist.userId)
                        }
                        disabled={isProcessing}
                      >
                        승인
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && activeTab === 'APPROVED' && (
        <Card>
          {approvedPharmacists.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              승인 완료된 약사 계정이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {approvedPharmacists.map((user) => renderAdminUserItem(user))}
            </div>
          )}
        </Card>
      )}

      {!isLoading && !isError && activeTab === 'REJECTED' && (
        <Card>
          {rejectedPharmacists.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              반려된 약사 계정이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rejectedPharmacists.map((user) => renderAdminUserItem(user))}
            </div>
          )}
        </Card>
      )}

      <div className="rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
        약사 인증 승인 시 해당 회원의 약사 계정이 활성화됩니다. 거절 시에는
        계정 상태가 승인 불가 또는 재제출 대기 상태로 변경될 수 있으므로 제출
        정보를 확인한 뒤 처리해주세요.
      </div>
    </div>
  );
}

export default PharmacistManagePage;