import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthSession, logout } from '../../api'

const PHARM_MENUS = [
  { label: '대시보드', path: '/p/dashboard' },
  { label: '상담 관리', path: '/p/rooms' },
  { label: '리뷰 조회', path: '/p/reviews' },
  { label: '약국 재고 관리', path: '/p/inventory' },
  { label: '내 정보 관리', path: '/p/profile' },
]

function PharmacistSidebar() {
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
          {PHARM_MENUS.map((menu) => (
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

function PharmLayout() {
  return (
    <div className="app-shell pharm-theme">
      <PharmacistSidebar />

      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default PharmLayout
