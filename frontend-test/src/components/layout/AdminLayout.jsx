import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthSession, logout } from '../../api'

const ADMIN_MENUS = [
  { label: '대시보드', path: '/a/dashboard' },
  { label: '약사 승인 관리', path: '/a/approvals' },
  { label: '전체 회원 관리', path: '/a/users' },
  { label: '데이터 동기화', path: '/a/sync' },
]

function AdminSidebar() {
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
          <p>ADMINISTRATOR</p>
        </div>

        <nav className="app-sidebar-nav">
          {ADMIN_MENUS.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
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

function AdminLayout() {
  return (
    <div className="app-shell admin-theme">
      <AdminSidebar />

      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
