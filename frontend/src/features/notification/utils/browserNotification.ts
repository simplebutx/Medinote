export type BrowserNotificationPermission =
  | NotificationPermission
  | 'unsupported';

export function canUseBrowserNotifications() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.isSecureContext
  );
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!canUseBrowserNotifications()) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function showBrowserNotification(options: {
  title: string;
  body: string;
  tag: string;
}) {
  if (
    !canUseBrowserNotifications() ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  try {
    new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      renotify: true,
    });
  } catch (error) {
    console.error('브라우저 알림 표시 실패:', error);
  }
}
