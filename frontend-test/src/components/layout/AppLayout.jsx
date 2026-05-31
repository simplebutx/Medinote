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

function getRoleLabel(role) {
  if (role === 'PHARMACIST') return 'PHARMACIST'
  if (role === 'ADMIN') return 'ADMIN'
  return 'USER'
}

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-inner">
        <div className="app-sidebar-brand">
          <h1>AI 복약 도우미</h1>
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
      </div>
    </aside>
  )
}

function Topbar() {
  const navigate = useNavigate()
  const session = getAuthSession()
  const role = getRoleLabel(session?.role)

  const handleLogout = async () => {
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
    <header className="app-topbar">
      <div>
        <p className="app-topbar-label">현재 역할</p>
        <p className="app-topbar-role">{role}</p>
      </div>

      <div className="app-topbar-actions">
        <button type="button" className="app-topbar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Topbar />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
