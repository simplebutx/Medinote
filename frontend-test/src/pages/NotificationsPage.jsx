import { useEffect, useMemo, useState } from 'react'
import {
  deleteAllConsultationNotifications,
  deleteAllNotifications,
  deleteConsultationNotification,
  deleteNotification,
  getConsultationNotifications,
  getNotifications,
  markConsultationNotificationRead,
  markNotificationRead,
  sendTestNotification,
} from '../api'
import {
  emitInAppMedicationNotification,
  emitNotificationsChanged,
} from '../components/MedicationNotificationWatcher'

const SOURCE = {
  MEDICATION: 'MEDICATION',
  CONSULTATION: 'CONSULTATION',
}

const formatDateTime = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const getStatusLabel = (notification) => {
  if (notification.source === SOURCE.CONSULTATION) {
    return notification.readAt ? '읽음' : '새 메시지'
  }

  if (notification.status === 'PENDING') return '예약됨'
  if (notification.status === 'SENT') return '발송됨'
  if (notification.status === 'FAILED') return '실패'
  return notification.status
}

const getPermissionLabel = (permission) => {
  if (!('Notification' in window)) return '지원 안 됨'
  if (!window.isSecureContext) return 'localhost 필요'
  if (permission === 'granted') return '허용됨'
  if (permission === 'denied') return '차단됨'
  return '대기 중'
}

const normalizeMedicationNotification = (notification) => ({
  ...notification,
  source: SOURCE.MEDICATION,
  uniqueId: `${SOURCE.MEDICATION}-${notification.id}`,
  displayTime: notification.sentAt || notification.scheduledAt || notification.createdAt,
})

const normalizeConsultationNotification = (notification) => ({
  ...notification,
  source: SOURCE.CONSULTATION,
  uniqueId: `${SOURCE.CONSULTATION}-${notification.id}`,
  status: 'SENT',
  displayTime: notification.createdAt,
})

const getUnreadNotificationCount = (notifications) => (
  notifications
    .filter((notification) => notification.status === 'SENT')
    .filter((notification) => !notification.readAt)
    .length
)

function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(notifications),
    [notifications],
  )

  const loadNotifications = async ({ silent = false, notifyChanged = true } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setMessage('')

    try {
      const [medicationResult, consultationResult] = await Promise.allSettled([
        getNotifications(),
        getConsultationNotifications(),
      ])

      const medicationNotifications =
        medicationResult.status === 'fulfilled' ? medicationResult.value : []
      const consultationNotifications =
        consultationResult.status === 'fulfilled' ? consultationResult.value : []

      const merged = [
        ...medicationNotifications.map(normalizeMedicationNotification),
        ...consultationNotifications.map(normalizeConsultationNotification),
      ].sort((left, right) => new Date(right.displayTime) - new Date(left.displayTime))

      setNotifications(merged)
      if (notifyChanged) {
        emitNotificationsChanged()
      }

      if (medicationResult.status === 'rejected' || consultationResult.status === 'rejected') {
        setMessage('일부 알림을 불러오지 못했습니다. 서버 연결을 확인해 주세요.')
      }
    } catch (error) {
      console.error('failed to load notifications', error)
      setMessage('알림 목록을 불러오지 못했습니다.')
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setMessage('이 브라우저는 PC 알림을 지원하지 않습니다.')
      return
    }

    if (!window.isSecureContext) {
      setMessage('브라우저 알림은 localhost 또는 HTTPS 환경에서만 동작합니다.')
      return
    }

    const nextPermission = await Notification.requestPermission()
    setPermission(nextPermission)
  }

  const handleRead = async (notification) => {
    try {
      const updated = notification.source === SOURCE.CONSULTATION
        ? await markConsultationNotificationRead(notification.id)
        : await markNotificationRead(notification.id)

      const normalized = notification.source === SOURCE.CONSULTATION
        ? normalizeConsultationNotification(updated)
        : normalizeMedicationNotification(updated)

      setNotifications((current) =>
        current.map((item) => item.uniqueId === notification.uniqueId ? normalized : item),
      )
      emitNotificationsChanged()
    } catch (error) {
      console.error('failed to mark notification read', error)
      setMessage('읽음 처리에 실패했습니다.')
    }
  }

  const handleReadAll = async () => {
    const unreadNotifications = notifications
      .filter((notification) => notification.status === 'SENT')
      .filter((notification) => !notification.readAt)

    if (unreadNotifications.length === 0) {
      return
    }

    try {
      const results = await Promise.allSettled(
        unreadNotifications.map((notification) => (
          notification.source === SOURCE.CONSULTATION
            ? markConsultationNotificationRead(notification.id)
            : markNotificationRead(notification.id)
        )),
      )

      const updatedByKey = new Map()

      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          return
        }

        const original = unreadNotifications[index]
        const normalized = original.source === SOURCE.CONSULTATION
          ? normalizeConsultationNotification(result.value)
          : normalizeMedicationNotification(result.value)

        updatedByKey.set(original.uniqueId, normalized)
      })

      setNotifications((current) =>
        current.map((notification) => updatedByKey.get(notification.uniqueId) || notification),
      )
      emitNotificationsChanged()

      if (updatedByKey.size !== unreadNotifications.length) {
        setMessage('일부 알림을 읽음 처리하지 못했습니다.')
      }
    } catch (error) {
      console.error('failed to mark all notifications read', error)
      setMessage('전체 읽음 처리에 실패했습니다.')
    }
  }

  const handleTest = async () => {
    try {
      const created = await sendTestNotification({
        title: '복약 테스트 알림',
        body: 'PC 알림창 표시를 확인하는 테스트입니다.',
      })
      const normalized = normalizeMedicationNotification(created)

      setNotifications((current) => [normalized, ...current])
      emitInAppMedicationNotification(created)
      emitNotificationsChanged()

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(created.title, {
          body: created.body,
          tag: `medication-test-${created.id}`,
        })
      } else {
        setMessage('테스트 알림이 생성되었습니다. PC 알림을 보려면 권한을 허용해 주세요.')
      }
    } catch (error) {
      console.error('failed to send test notification', error)
      setMessage('테스트 알림 발송에 실패했습니다.')
    }
  }

  const handleDelete = async (notification) => {
    try {
      if (notification.source === SOURCE.CONSULTATION) {
        await deleteConsultationNotification(notification.id)
      } else {
        await deleteNotification(notification.id)
      }

      setNotifications((current) =>
        current.filter((item) => item.uniqueId !== notification.uniqueId),
      )
      emitNotificationsChanged()
    } catch (error) {
      console.error('failed to delete notification', error)
      setMessage('알림 삭제에 실패했습니다.')
    }
  }

  const handleDeleteAll = async () => {
    if (notifications.length === 0) {
      return
    }

    try {
      await Promise.allSettled([
        deleteAllNotifications(),
        deleteAllConsultationNotifications(),
      ])
      setNotifications([])
      emitNotificationsChanged()
    } catch (error) {
      console.error('failed to delete all notifications', error)
      setMessage('전체 알림 삭제에 실패했습니다.')
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    let reloadTimerId = null

    const reloadAfterArrived = () => {
      window.clearTimeout(reloadTimerId)
      reloadTimerId = window.setTimeout(() => {
        loadNotifications({ silent: true, notifyChanged: false })
      }, 200)
    }

    window.addEventListener('mymedi:medication-notification', reloadAfterArrived)
    window.addEventListener('mymedi:consultation-notification', reloadAfterArrived)

    return () => {
      window.clearTimeout(reloadTimerId)
      window.removeEventListener('mymedi:medication-notification', reloadAfterArrived)
      window.removeEventListener('mymedi:consultation-notification', reloadAfterArrived)
    }
  }, [])

  return (
    <div className="app-page notification-page">
      <div className="app-page-header notification-header">
        <div>
          <p className="app-page-eyebrow">Notifications</p>
          <h1 className="app-page-title">알림</h1>
          <p className="app-page-description">
            복약 시간과 상담 메시지 알림을 한 곳에서 확인합니다.
          </p>
        </div>

        <div className="notification-actions">
          <button type="button" className="app-primary-button" onClick={requestPermission}>
            알림 권한 허용
          </button>
          <button type="button" className="app-secondary-button" onClick={handleTest}>
            테스트 알림
          </button>
        </div>
      </div>

      <section className="notification-summary-grid">
        <div className="app-card notification-summary-card">
          <span>PC 알림 상태</span>
          <strong>{getPermissionLabel(permission)}</strong>
          <button type="button" className="app-primary-button" onClick={requestPermission}>
            알림 권한 허용
          </button>
        </div>
        <div className="app-card notification-summary-card">
          <span>읽지 않은 알림</span>
          <strong>{unreadCount}개</strong>
          <button type="button" className="app-secondary-button" onClick={handleTest}>
            테스트 알림
          </button>
        </div>
      </section>

      {message && <div className="schedule-banner">{message}</div>}

      <section className="app-card notification-list-card">
        <div className="notification-list-header">
          <h2>알림 목록</h2>
          <div className="notification-list-actions">
            <button type="button" className="app-secondary-button" onClick={loadNotifications}>
              새로고침
            </button>
            <button
              type="button"
              className="app-secondary-button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
            >
              전체 읽음
            </button>
            <button
              type="button"
              className="app-secondary-button notification-danger-button"
              onClick={handleDeleteAll}
              disabled={notifications.length === 0}
            >
              전체 삭제
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="notification-empty">알림을 불러오는 중입니다.</p>
        ) : notifications.length === 0 ? (
          <p className="notification-empty">아직 알림이 없습니다.</p>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article
                key={notification.uniqueId}
                className={[
                  'notification-item',
                  notification.readAt ? 'notification-item-read' : '',
                ].join(' ').trim()}
              >
                <div className="notification-item-main">
                  <div className="notification-item-title-row">
                    <h3>{notification.title}</h3>
                    <span>{getStatusLabel(notification)}</span>
                    <span>{notification.source === SOURCE.CONSULTATION ? '상담' : '복약'}</span>
                  </div>
                  <p>{notification.body}</p>
                  <small>
                    {notification.source === SOURCE.CONSULTATION
                      ? `도착 ${formatDateTime(notification.createdAt)}`
                      : `예정 ${formatDateTime(notification.scheduledAt)}${
                          notification.sentAt ? ` · 발송 ${formatDateTime(notification.sentAt)}` : ''
                        }`}
                  </small>
                </div>

                <div className="notification-item-actions">
                  {notification.status === 'SENT' && !notification.readAt && (
                    <button
                      type="button"
                      className="app-secondary-button"
                      onClick={() => handleRead(notification)}
                    >
                      읽음
                    </button>
                  )}
                  <button
                    type="button"
                    className="notification-delete-button"
                    onClick={() => handleDelete(notification)}
                    aria-label="알림 삭제"
                    title="알림 삭제"
                  >
                    ×
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default NotificationsPage
