import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button, Card } from '../../components/ui';
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

type NotifFilter = 'all' | 'unread';

function MedicationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="M8.5 8.5 16 16"/>
    </svg>
  );
}

function ConsultIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  );
}

function PharmNotifPage() {
  const navigate = useNavigate();
  const role = useUserStore((state) => state.role);
  const userId = useUserStore((state) => state.userId);
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('all');
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

  const displayedNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return sortedNotifications.filter((n) => !n.readAt);
    }
    return sortedNotifications;
  }, [sortedNotifications, activeFilter]);

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
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRequestBrowserNotificationPermission}
            disabled={browserNotificationPermission !== 'default'}
            className={[
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
              browserNotificationPermission === 'granted'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                : browserNotificationPermission === 'denied' || browserNotificationPermission === 'unsupported'
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-default'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700',
            ].join(' ')}
          >
            <BellIcon className="h-4 w-4" />
            {browserNotificationButtonLabel}
          </button>

          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleDeleteAllNotifications}
            disabled={notifications.length === 0 || deleteAllNotificationsMutation.isPending}
          >
            {deleteAllNotificationsMutation.isPending ? '삭제 중...' : '전체 삭제'}
          </Button>
        </div>
      </div>

      {/* ── Notification list card ── */}
      <Card className="overflow-hidden p-0">
        {/* Card header with filter tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-700">알림 목록</h2>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['all', 'unread'] as NotifFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={[
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none',
                  activeFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {filter === 'all' ? '전체' : '읽지 않음'}
                {filter === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div>
          {isLoading && (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              알림을 불러오는 중입니다.
            </div>
          )}

          {!isLoading && displayedNotifications.length === 0 && (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <BellIcon className="text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {activeFilter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {activeFilter === 'unread'
                  ? '모든 알림을 확인했습니다.'
                  : role === 'PHARMACIST'
                    ? '상담 요청이 들어오면 이곳에서 알림을 확인할 수 있습니다.'
                    : '복약 시간이 되면 알림이 이곳에 표시됩니다.'}
              </p>
            </div>
          )}

          {!isLoading && displayedNotifications.map((notification) => {
            const isUnread = !notification.readAt;
            const isMedication = notification.source === 'MEDICATION';
            const title = notification.title || (isMedication ? '복약 알림' : '상담 알림');

            return (
              <div
                key={`${notification.source}-${notification.id}`}
                className={[
                  'flex gap-3 border-l-2 px-5 py-4 transition',
                  isUnread
                    ? 'border-l-emerald-400 bg-emerald-50/30'
                    : 'border-l-transparent border-b border-b-slate-100 bg-white hover:bg-slate-50/50',
                ].join(' ')}
              >
                {/* Source icon */}
                <div className={[
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isMedication ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600',
                ].join(' ')}>
                  {isMedication ? <MedicationIcon /> : <ConsultIcon />}
                </div>

                {/* Content — clickable area */}
                <button
                  type="button"
                  onClick={() => handleClickNotification(notification)}
                  className="min-w-0 flex-1 text-left"
                >
                  {/* Title row */}
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                    )}
                    <span className="text-sm font-semibold text-slate-900">{title}</span>
                    <span className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      isMedication
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                    ].join(' ')}>
                      {isMedication ? '복약' : '상담'}
                    </span>
                  </div>

                  {/* Body */}
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {notification.body || '알림 내용이 없습니다.'}
                  </p>

                  {/* Meta row */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                    {notification.targetId && (
                      <>
                        <span>·</span>
                        <span>
                          {isMedication ? '일정' : '상담방'} #{notification.targetId}
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end justify-start gap-1 pt-0.5">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleReadNotification(notification)}
                      disabled={readNotificationMutation.isPending}
                      className="text-xs font-medium text-emerald-600 transition hover:text-emerald-800 disabled:opacity-50"
                    >
                      읽음
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteNotification(notification)}
                    disabled={deleteNotificationMutation.isPending}
                    className="text-xs font-medium text-slate-400 transition hover:text-red-500 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default PharmNotifPage;
