import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  clearAuthSession,
  getAuthSession,
  getConsultationNotifications,
  getNotifications,
  logout,
} from '../../api'

const USER_MENUS = [
  { label: '복약 일정', path: '/app/schedule' },
  { label: '복약 등록', path: '/app/ocr' },
  { label: 'AI 의약품 정보 도우미', path: '/app/chatbot' },
  { label: '상담', path: '/app/chat' },
  { label: '약 검색', path: '/app/drugs' },
  { label: '근처 약국', path: '/app/pharmacies' },
  { label: '알림', path: '/app/notifications', badge: 'notifications' },
  { label: '스마트 약통', path: '/app/iot' },
  { label: '내 정보', path: '/app/my' },
]

const getUnreadNotificationCount = (notifications) => (
  notifications
    .filter((notification) => notification.status === 'SENT')
    .filter((notification) => !notification.readAt)
    .length
)

const getUnreadConsultationNotificationCount = (notifications) => (
  notifications
    .filter((notification) => !notification.readAt)
    .length
)

function Sidebar({ unreadNotificationCount }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const session = getAuthSession()

    try {
      if (session?.accessToken) {
        await logout(session.accessToken)
      }
    } catch (error) {
      console.error('logout failed', error)
    } finally {
      clearAuthSession()
      navigate('/login')
    }
  }

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-inner">
        <div className="app-sidebar-brand">
          <h1>MYMEDI</h1>
          <p>USER</p>
        </div>

        <nav className="app-sidebar-nav">
          {USER_MENUS.map((menu) => {
            const showBadge = menu.badge === 'notifications' && unreadNotificationCount > 0

            return (
              <NavLink
                key={menu.path}
                to={menu.path}
                end={menu.path === '/app/schedule'}
                className={({ isActive }) =>
                  ['app-sidebar-link', isActive ? 'app-sidebar-link-active' : ''].join(' ').trim()
                }
              >
                <span>{menu.label}</span>
                {showBadge && (
                  <span className="app-sidebar-badge">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="app-sidebar-footer">
          <button type="button" className="app-sidebar-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  )
}

function AppLayout() {
  const [toast, setToast] = useState(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const refreshUnreadNotificationCount = async () => {
    const session = getAuthSession()

    if (!session?.accessToken) {
      setUnreadNotificationCount(0)
      return
    }

    try {
      const [medicationResult, consultationResult] = await Promise.allSettled([
        getNotifications(),
        getConsultationNotifications(),
      ])
      const notifications = medicationResult.status === 'fulfilled' ? medicationResult.value : []
      const consultationNotifications =
        consultationResult.status === 'fulfilled' ? consultationResult.value : []

      setUnreadNotificationCount(
        getUnreadNotificationCount(notifications)
        + getUnreadConsultationNotificationCount(consultationNotifications),
      )
    } catch (error) {
      console.error('failed to load notification count', error)
    }
  }

  useEffect(() => {
    const handleMedicationNotification = (event) => {
      setToast(event.detail)
      refreshUnreadNotificationCount()
    }

    const handleConsultationNotification = (event) => {
      setToast(event.detail)
      refreshUnreadNotificationCount()
    }

    const handleNotificationsChanged = () => {
      refreshUnreadNotificationCount()
    }

    window.addEventListener('mymedi:medication-notification', handleMedicationNotification)
    window.addEventListener('mymedi:consultation-notification', handleConsultationNotification)
    window.addEventListener('mymedi:notifications-changed', handleNotificationsChanged)
    refreshUnreadNotificationCount()

    const intervalId = window.setInterval(refreshUnreadNotificationCount, 15000)

    return () => {
      window.removeEventListener('mymedi:medication-notification', handleMedicationNotification)
      window.removeEventListener('mymedi:consultation-notification', handleConsultationNotification)
      window.removeEventListener('mymedi:notifications-changed', handleNotificationsChanged)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      setToast(null)
    }, 7000)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [toast])

  return (
    <div className="app-shell">
      <Sidebar unreadNotificationCount={unreadNotificationCount} />

      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {toast && (
        <aside className="in-app-notification-toast" role="status" aria-live="polite">
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="알림 닫기">
            ×
          </button>
        </aside>
      )}
    </div>
  )
}

export default AppLayout
