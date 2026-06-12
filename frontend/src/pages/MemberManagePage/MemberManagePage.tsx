import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge, Button, Card, Input } from '../../components/ui';
import { useAdminUsers, useDeleteAdminUser } from '../../features/admin/hooks';
import type { AdminUser } from '../../features/admin/types/admin.types';

function getStatusLabel(status?: string | null) {
  if (status === 'ACTIVE') return '활성';
  return '비활성';
}

function getStatusBadge(status?: string | null) {
  if (status === 'ACTIVE') return 'green';
  return 'gray';
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'MALE') return '남성';
  if (gender === 'FEMALE') return '여성';
  return '-';
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

function getAdminUserId(user: AdminUser) {
  return user.userId ?? user.id;
}

function MemberManagePage() {
  const [keyword, setKeyword] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const {
    data: adminUsers = [],
    isLoading,
    isError,
  } = useAdminUsers();

  const deleteAdminUserMutation = useDeleteAdminUser();

  const filteredUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      if (user.role !== 'USER') {
        return false;
      }

      const query = keyword.trim().toLowerCase();

      const username = user.username?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';

      const matchesKeyword =
        !query || username.includes(query) || email.includes(query);

      return matchesKeyword;
    });
  }, [adminUsers, keyword]);

  const handleDeleteUser = (user: AdminUser) => {
    const userId = getAdminUserId(user);

    if (!userId) {
      toast.error('회원 ID를 확인할 수 없습니다.');
      return;
    }

    if (user.role === 'ADMIN') {
      toast.error('관리자 계정은 화면에서 삭제할 수 없습니다.');
      return;
    }

    const displayName = user.username || user.email || '선택한';

    const isConfirmed = window.confirm(
      `${displayName} 회원을 삭제하시겠습니까?`,
    );

    if (!isConfirmed) return;

    deleteAdminUserMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('회원이 삭제되었습니다.');
        setExpandedUserId(null);
      },
      onError: (error) => {
        console.error('회원 삭제 실패:', error);
        toast.error('회원 삭제에 실패했습니다.');
      },
    });
  };


  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Member Management</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          회원 관리
        </h1>

        <p className="mt-2 text-slate-500">
          일반 사용자 계정과 건강 정보를 확인하고 관리합니다.
        </p>
      </div>

      <Card>
        <div className="max-w-md">
          <Input
            placeholder="이름 또는 이메일 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </Card>

      {isLoading && (
        <div className="rounded-2xl bg-blue-50 p-5 text-sm text-blue-700">
          회원 목록을 불러오는 중입니다.
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
          회원 목록을 불러오지 못했습니다. 관리자 권한과 로그인 상태를
          확인해주세요.
        </div>
      )}

      {!isLoading && !isError && filteredUsers.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
          조건에 맞는 회원이 없습니다.
        </div>
      )}

      {!isLoading && !isError && filteredUsers.length > 0 && (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const userId = getAdminUserId(user);
            const isExpanded = expandedUserId === userId;

            return (
              <Card key={userId}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpandedUserId(isExpanded ? null : userId)
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {user.username || '이름 정보 없음'}
                      </h2>

                      <Badge variant={getStatusBadge(user.status)}>
                        {getStatusLabel(user.status)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">{user.email}</p>

                    <p className="mt-1 text-sm text-slate-500">
                      성별: {getGenderLabel(user.gender)} · 생년월일:{' '}
                      {user.birthDate || '-'} · 가입일:{' '}
                      {formatDateTime(user.createdAt)}
                    </p>
                  </button>

                  {user.role !== 'ADMIN' && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="border border-red-200 text-red-600 hover:bg-red-50"
                      disabled={deleteAdminUserMutation.isPending}
                      onClick={() => handleDeleteUser(user)}
                    >
                      삭제
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        건강 정보
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={user.isPregnant ? 'red' : 'gray'}>
                          임신 {user.isPregnant ? 'Y' : 'N'}
                        </Badge>
                        <Badge variant={user.isBreastfeeding ? 'red' : 'gray'}>
                          수유 {user.isBreastfeeding ? 'Y' : 'N'}
                        </Badge>
                        <Badge variant={user.isSmoking ? 'red' : 'gray'}>
                          흡연 {user.isSmoking ? 'Y' : 'N'}
                        </Badge>
                        <Badge variant={user.isDrinking ? 'red' : 'gray'}>
                          음주 {user.isDrinking ? 'Y' : 'N'}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        기저질환
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.chronicDiseases &&
                        user.chronicDiseases.length > 0 ? (
                          user.chronicDiseases.map((disease) => (
                            <Badge key={disease} variant="blue">
                              {disease}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            등록된 기저질환 정보가 없습니다.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-700">
        회원 관리는 일반 사용자 계정을 확인하고 필요 시 삭제 처리하는 관리자 기능입니다.
        약사 승인과 거절은 약사 관리 화면에서 처리합니다.
      </div>
    </div>
  );
}

export default MemberManagePage;
