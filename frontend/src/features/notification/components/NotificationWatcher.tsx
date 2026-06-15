import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useUserStore } from '../../../store/useUserStore';
import { useAppNotifications } from '../hooks';
import type { AppNotification } from '../types';
import { showBrowserNotification } from '../utils/browserNotification';

const POLLING_INTERVAL_MS = 5_000;
const RECENT_NOTIFICATION_WINDOW_MS = 2 * 60 * 1_000;
const MAX_STORED_NOTIFICATION_IDS = 200;

function getStorageKey(role: string, userId: number) {
  return `mymedi:shown-notification-ids:${role}:${userId}`;
}

function getNotificationKey(notification: AppNotification) {
  return `${notification.source}:${notification.id}`;
}

function readShownNotificationIds(storageKey: string) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue.filter(
        (notificationId): notificationId is string =>
          typeof notificationId === 'string',
      ),
    );
  } catch {
    window.localStorage.removeItem(storageKey);
    return new Set<string>();
  }
}

function saveShownNotificationIds(
  storageKey: string,
  shownNotificationIds: Set<string>,
) {
  const recentIds = [...shownNotificationIds].slice(
    -MAX_STORED_NOTIFICATION_IDS,
  );

  window.localStorage.setItem(storageKey, JSON.stringify(recentIds));
}

function getNotificationTimestamp(notification: AppNotification) {
  if (
    notification.source === 'MEDICATION' &&
    'sentAt' in notification.raw
  ) {
    return notification.raw.sentAt;
  }

  return notification.createdAt;
}

function isNotificationEligible(
  notification: AppNotification,
  currentTime: number,
) {
  if (notification.readAt) {
    return false;
  }

  if (
    notification.source === 'MEDICATION' &&
    (!('status' in notification.raw) || notification.raw.status !== 'SENT')
  ) {
    return false;
  }

  const timestamp = getNotificationTimestamp(notification);

  if (!timestamp) {
    return false;
  }

  const notificationTime = new Date(timestamp).getTime();
  const age = currentTime - notificationTime;

  return (
    Number.isFinite(notificationTime) &&
    age >= 0 &&
    age <= RECENT_NOTIFICATION_WINDOW_MS
  );
}

function showInAppNotification(notification: AppNotification) {
  const title =
    notification.title ||
    (notification.source === 'MEDICATION'
      ? '복약 시간이에요'
      : '새 상담 메시지');
  const body =
    notification.body ||
    (notification.source === 'MEDICATION'
      ? '등록한 약을 복용할 시간입니다.'
      : '상담 답장이 도착했습니다.');
  const notificationKey = getNotificationKey(notification);

  toast.custom(
    <div
      className="w-80 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600">{body}</p>
    </div>,
    {
      id: `notification-${notificationKey}`,
      duration: 7_000,
    },
  );

  showBrowserNotification({
    title,
    body,
    tag: `mymedi-${notificationKey}`,
  });
}

function NotificationWatcher() {
  const role = useUserStore((state) => state.role);
  const userId = useUserStore((state) => state.userId);
  const status = useUserStore((state) => state.status);
  const isApprovedPharmacist =
    role === 'PHARMACIST' &&
    (status === 'ACTIVE' || status === 'APPROVED');
  const canWatchNotifications = role === 'USER' || isApprovedPharmacist;

  const { data: notifications = [] } = useAppNotifications(role, {
    enabled: canWatchNotifications && userId !== null,
    userId,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!canWatchNotifications || userId === null || role === null) {
      return;
    }

    const storageKey = getStorageKey(role, userId);
    const shownNotificationIds = readShownNotificationIds(storageKey);
    const currentTime = Date.now();
    const newNotifications = notifications
      .filter((notification) =>
        isNotificationEligible(notification, currentTime),
      )
      .filter(
        (notification) =>
          !shownNotificationIds.has(getNotificationKey(notification)),
      )
      .sort((left, right) => {
        const leftTime = getNotificationTimestamp(left);
        const rightTime = getNotificationTimestamp(right);

        return (
          new Date(leftTime ?? 0).getTime() -
          new Date(rightTime ?? 0).getTime()
        );
      });

    if (newNotifications.length === 0) {
      return;
    }

    newNotifications.forEach((notification) => {
      shownNotificationIds.add(getNotificationKey(notification));
      showInAppNotification(notification);
    });

    saveShownNotificationIds(storageKey, shownNotificationIds);
  }, [canWatchNotifications, notifications, role, userId]);

  return null;
}

export default NotificationWatcher;
