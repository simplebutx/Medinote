import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Badge, Button, Card } from '../../components/ui';
import {
  useAppNotifications,
  useDeleteAllAppNotifications,
  useDeleteAppNotification,
  useReadAppNotification,
} from '../../features/notification/hooks';
import type { AppNotification } from '../../features/notification/types';
import {
  canUseBrowserNotifications,
  getBrowserNotificationPermission,
  type BrowserNotificationPermission,
} from '../../features/notification/utils/browserNotification';
import { useUserStore } from '../../store/useUserStore';

function formatNotificationDate(createdAt?: string | null) {
  if (!createdAt) {
    return '시간 정보 없음';
  }

  return createdAt.slice(0, 16).replace('T', ' ');
}

function getNotificationTargetPath(
  role: string | null,
  notification: AppNotification,
) {
  if (notification.source === 'MEDICATION') {
    return '/app/schedule';
  }

  if (role === 'PHARMACIST') {
    return '/pharmacist/consults';
  }

  return '/app/chat';
}

function NotifPage() {
  const navigate = useNavigate();
  const role = useUserStore((state) => state.role);
  const userId = useUserStore((state) => state.userId);
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermission>(() =>
      getBrowserNotificationPermission(),
    );

  const { data: notifications = [], isLoading } = useAppNotifications(role, {
    userId,
  });

  const readNotificationMutation = useReadAppNotification();
  const deleteNotificationMutation = useDeleteAppNotification();
  const deleteAllNotificationsMutation = useDeleteAllAppNotifications(role);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.readAt).length;
  }, [notifications]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications]);

  const handleClickNotification = async (notification: AppNotification) => {
    try {
      if (!notification.readAt) {
        await readNotificationMutation.mutateAsync(notification);
      }

      navigate(getNotificationTargetPath(role, notification));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      toast.error('알림을 읽음 처리하지 못했습니다.');
    }
  };

  const handleReadNotification = (notification: AppNotification) => {
    readNotificationMutation.mutate(notification, {
      onSuccess: () => {
        toast.success('알림을 읽음 처리했습니다.');
      },
      onError: (error) => {
        console.error('알림 읽음 처리 실패:', error);
        toast.error('알림을 읽음 처리하지 못했습니다.');
      },
    });
  };

  const handleDeleteNotification = (notification: AppNotification) => {
    const isConfirmed = window.confirm('이 알림을 삭제하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    deleteNotificationMutation.mutate(notification, {
      onSuccess: () => {
        toast.success('알림이 삭제되었습니다.');
      },
      onError: (error) => {
        console.error('알림 삭제 실패:', error);
        toast.error('알림 삭제에 실패했습니다.');
      },
    });
  };

  const handleDeleteAllNotifications = () => {
    if (notifications.length === 0) {
      return;
    }

    const isConfirmed = window.confirm(
      '모든 알림을 삭제하시겠습니까?\n삭제한 알림은 목록에서 보이지 않습니다.',
    );

    if (!isConfirmed) {
      return;
    }

    deleteAllNotificationsMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('모든 알림이 삭제되었습니다.');
      },
      onError: (error) => {
        console.error('전체 알림 삭제 실패:', error);
        toast.error('전체 알림 삭제에 실패했습니다.');
      },
    });
  };

  const handleRequestBrowserNotificationPermission = async () => {
    if (!canUseBrowserNotifications()) {
      toast.error('이 브라우저에서는 알림 기능을 사용할 수 없습니다.');
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);

    if (permission === 'granted') {
      toast.success('브라우저 알림이 허용되었습니다.');
      return;
    }

    toast.error('브라우저 설정에서 알림 권한을 허용해주세요.');
  };

  const browserNotificationButtonLabel =
    browserNotificationPermission === 'granted'
      ? '브라우저 알림 허용됨'
      : browserNotificationPermission === 'denied'
        ? '브라우저 알림 차단됨'
        : browserNotificationPermission === 'unsupported'
          ? '브라우저 알림 미지원'
          : '브라우저 알림 허용';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Notifications</p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">알림</h1>

          <p className="mt-2 text-slate-500">
            상담 요청, 상담 메시지, 상담 상태 변경 알림을 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200"
            onClick={handleRequestBrowserNotificationPermission}
            disabled={browserNotificationPermission !== 'default'}
          >
            {browserNotificationButtonLabel}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200"
            onClick={handleDeleteAllNotifications}
            disabled={
              notifications.length === 0 ||
              deleteAllNotificationsMutation.isPending
            }
          >
            {deleteAllNotificationsMutation.isPending
              ? '삭제 중...'
              : '전체 삭제'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">전체 알림</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {notifications.length}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">읽지 않은 알림</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {unreadCount}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">읽은 알림</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {notifications.length - unreadCount}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">알림 목록</h2>
            <p className="mt-1 text-sm text-slate-500">
              알림을 선택하면 관련 상담 화면으로 이동합니다.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              알림을 불러오는 중입니다.
            </div>
          )}

          {!isLoading && sortedNotifications.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              {role === 'PHARMACIST'
                ? '상담 알림 API가 준비되면 이곳에서 상담 알림을 확인할 수 있습니다.'
                : '복약 알림 API가 준비되면 이곳에서 복약 알림과 상담 알림을 확인할 수 있습니다.'}
            </div>
          )}

          {!isLoading &&
            sortedNotifications.map((notification) => {
              const isUnread = !notification.readAt;

              return (
                <div
                  key={`${notification.source}-${notification.id}`}
                  className={[
                    'rounded-2xl border p-5 transition',
                    isUnread
                      ? 'border-blue-100 bg-blue-50'
                      : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleClickNotification(notification)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {notification.title || '상담 알림'}
                        </p>

                        {isUnread ? (
                          <Badge variant="blue">읽지 않음</Badge>
                        ) : (
                          <Badge variant="gray">읽음</Badge>
                        )}

                        <Badge variant={notification.source === 'MEDICATION' ? 'green' : 'yellow'}>
                          {notification.source === 'MEDICATION' ? '복약' : '상담'}
                        </Badge>

                        {notification.targetId && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                            {notification.source === 'MEDICATION'
                              ? `일정 #${notification.targetId}`
                              : `상담방 #${notification.targetId}`}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.body || '알림 내용이 없습니다.'}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {formatNotificationDate(notification.createdAt)}
                      </p>
                    </button>

                    <div className="flex shrink-0 gap-2">
                      {isUnread && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="border border-slate-200"
                          onClick={() => handleReadNotification(notification)}
                          disabled={readNotificationMutation.isPending}
                        >
                          읽음
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteNotification(notification)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}

export default NotifPage;
