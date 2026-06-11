import { useEffect, useRef } from 'react'
import { getAuthSession, getConsultationNotifications, getNotifications } from '../api'

const POLLING_INTERVAL_MS = 5000
const RECENT_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000
const STORAGE_KEY = 'shownMedicationNotificationIds'
const CONSULTATION_STORAGE_KEY = 'shownConsultationNotificationIds'

const getShownIdsFromStorage = (storageKey) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
  } catch {
    localStorage.removeItem(storageKey)
    return new Set()
  }
}

const saveShownIdsToStorage = (storageKey, shownIds) => {
  localStorage.setItem(storageKey, JSON.stringify([...shownIds].slice(-200)))
}

const canUseNotificationApi = () => (
  typeof window !== 'undefined'
  && 'Notification' in window
  && window.isSecureContext
)

const isRecentlySent = (notification) => {
  if (!notification.sentAt) {
    return false
  }

  const sentAt = new Date(notification.sentAt).getTime()
  const age = Date.now() - sentAt

  return age >= 0 && age <= RECENT_NOTIFICATION_WINDOW_MS
}

const isRecentlyCreated = (notification) => {
  if (!notification.createdAt) {
    return false
  }

  const createdAt = new Date(notification.createdAt).getTime()
  const age = Date.now() - createdAt

  return age >= 0 && age <= RECENT_NOTIFICATION_WINDOW_MS
}

export const emitInAppMedicationNotification = (notification) => {
  window.dispatchEvent(new CustomEvent('mymedi:medication-notification', {
    detail: {
      id: notification.id,
      title: notification.title || '복약 시간이에요',
      body: notification.body || '등록한 약을 복용할 시간입니다.',
    },
  }))
}

export const emitInAppConsultationNotification = (notification) => {
  window.dispatchEvent(new CustomEvent('mymedi:consultation-notification', {
    detail: {
      id: notification.id,
      title: notification.title || '새 상담 메시지',
      body: notification.body || '상담 답장이 도착했습니다.',
    },
  }))
}

export const emitNotificationsChanged = () => {
  window.dispatchEvent(new CustomEvent('mymedi:notifications-changed'))
}

function MedicationNotificationWatcher() {
  const shownIdsRef = useRef(getShownIdsFromStorage(STORAGE_KEY))
  const shownConsultationIdsRef = useRef(getShownIdsFromStorage(CONSULTATION_STORAGE_KEY))

  useEffect(() => {
    let stopped = false

    const showNotification = async (notification) => {
      const shownIds = shownIdsRef.current

      if (shownIds.has(notification.id) || notification.readAt) {
        return
      }

      shownIds.add(notification.id)
      saveShownIdsToStorage(STORAGE_KEY, shownIds)
      emitInAppMedicationNotification(notification)
      emitNotificationsChanged()

      if (canUseNotificationApi() && Notification.permission === 'granted') {
        new Notification(notification.title || '복약 시간이에요', {
          body: notification.body || '등록한 약을 복용할 시간입니다.',
          tag: `medication-${notification.id}`,
          renotify: true,
        })
      }
    }

    const showConsultationNotification = async (notification) => {
      const shownIds = shownConsultationIdsRef.current

      if (shownIds.has(notification.id) || notification.readAt) {
        return
      }

      shownIds.add(notification.id)
      saveShownIdsToStorage(CONSULTATION_STORAGE_KEY, shownIds)
      emitInAppConsultationNotification(notification)
      emitNotificationsChanged()

      if (canUseNotificationApi() && Notification.permission === 'granted') {
        new Notification(notification.title || '새 상담 메시지', {
          body: notification.body || '상담 답장이 도착했습니다.',
          tag: `consultation-${notification.id}`,
          renotify: true,
        })
      }
    }

    const poll = async () => {
      const session = getAuthSession()

      if (!session?.accessToken || stopped) {
        return
      }

      try {
        const notifications = await getNotifications()
        const dueNotifications = notifications
          .filter((notification) => notification.status === 'SENT')
          .filter((notification) => !notification.readAt)
          .filter(isRecentlySent)
          .sort((left, right) => new Date(left.sentAt) - new Date(right.sentAt))

        for (const notification of dueNotifications) {
          await showNotification(notification)
        }
      } catch (error) {
        console.error('failed to poll medication notifications', error)
      }

      try {
        const consultationNotifications = await getConsultationNotifications()
        const dueConsultationNotifications = consultationNotifications
          .filter((notification) => !notification.readAt)
          .filter((notification) => isRecentlyCreated(notification))
          .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))

        for (const notification of dueConsultationNotifications) {
          await showConsultationNotification(notification)
        }
      } catch (error) {
        console.error('failed to poll consultation notifications', error)
      }
    }

    poll()
    const intervalId = window.setInterval(poll, POLLING_INTERVAL_MS)

    return () => {
      stopped = true
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}

export default MedicationNotificationWatcher
