import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AdminInput, Badge, Button, Card } from '../../components/ui';
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
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <AdminInput
              placeholder="이름 또는 이메일 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          {!isLoading && !isError && (
            <p className="shrink-0 text-sm font-semibold text-slate-500">
              총 {filteredUsers.length}명
            </p>
          )}
        </div>
      </Card>

      <Card>
        {isLoading && (
          <div className="p-5 text-center text-sm text-slate-500">
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
          <div className="p-8 text-center text-sm text-slate-500">
            조건에 맞는 회원이 없습니다.
          </div>
        )}

        {!isLoading && !isError && filteredUsers.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredUsers.map((user) => {
              const userId = getAdminUserId(user);

              return (
                <div key={userId} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">
                        {user.username || '이름 정보 없음'}
                      </p>
                      <Badge variant={getStatusBadge(user.status)}>
                        {getStatusLabel(user.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      성별: {getGenderLabel(user.gender)} · 생년월일: {user.birthDate || '-'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      가입일: {formatDateTime(user.createdAt)}
                    </p>
                  </div>

                  {user.role !== 'ADMIN' && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 border border-red-200 text-red-600 hover:bg-red-50"
                      disabled={deleteAdminUserMutation.isPending}
                      onClick={() => handleDeleteUser(user)}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default MemberManagePage;
