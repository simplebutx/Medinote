import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthSession, logout } from '../../api'

const USER_MENUS = [
  { label: '복약 일정', path: '/app/schedule' },
  { label: '복약 등록', path: '/app/ocr' },
  { label: '챗봇 & 상담', path: '/app/chat' },
  { label: '약 검색', path: '/app/drugs' },
  { label: 'FAQ', path: '/app/faq' },
  { label: '근처 약국', path: '/app/pharmacies' },
  { label: '알림', path: '/app/notifications' },
  { label: '스마트 약통', path: '/app/iot' },
  { label: '내 정보', path: '/app/my' },
]

function Sidebar() {
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
          {USER_MENUS.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={menu.path === '/app/schedule'}
              className={({ isActive }) =>
                ['app-sidebar-link', isActive ? 'app-sidebar-link-active' : ''].join(' ').trim()
              }
            >
              {menu.label}
            </NavLink>
          ))}
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
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
