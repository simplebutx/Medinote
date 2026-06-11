import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthSession, getConsultationNotifications, logout } from '../../api'

const PHARM_MENUS = [
  { label: '대시보드', path: '/p/dashboard' },
  { label: '상담 관리', path: '/p/rooms' },
  { label: '리뷰 조회', path: '/p/reviews' },
  { label: '약국 재고 관리', path: '/p/inventory' },
  { label: '알림', path: '/p/notifications', badge: 'notifications' },
  { label: '내 정보 관리', path: '/p/profile' },
]

const getUnreadConsultationNotificationCount = (notifications) => (
  notifications
    .filter((notification) => !notification.readAt)
    .length
)

function PharmacistSidebar({ unreadNotificationCount }) {
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
          <p>PHARMACIST</p>
        </div>

        <nav className="app-sidebar-nav">
          {PHARM_MENUS.map((menu) => {
            const showBadge = menu.badge === 'notifications' && unreadNotificationCount > 0

            return (
              <NavLink
                key={menu.path}
                to={menu.path}
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

function PharmLayout() {
  const [toast, setToast] = useState(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const refreshUnreadNotificationCount = async () => {
    const session = getAuthSession()

    if (!session?.accessToken) {
      setUnreadNotificationCount(0)
      return
    }

    try {
      const notifications = await getConsultationNotifications()
      setUnreadNotificationCount(getUnreadConsultationNotificationCount(notifications))
    } catch (error) {
      console.error('failed to load pharmacist notification count', error)
    }
  }

  useEffect(() => {
    const handleConsultationNotification = (event) => {
      setToast(event.detail)
      refreshUnreadNotificationCount()
    }

    const handleNotificationsChanged = () => {
      refreshUnreadNotificationCount()
    }

    window.addEventListener('mymedi:consultation-notification', handleConsultationNotification)
    window.addEventListener('mymedi:notifications-changed', handleNotificationsChanged)
    refreshUnreadNotificationCount()

    const intervalId = window.setInterval(refreshUnreadNotificationCount, 15000)

    return () => {
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
    <div className="app-shell pharm-theme">
      <PharmacistSidebar unreadNotificationCount={unreadNotificationCount} />

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

export default PharmLayout
