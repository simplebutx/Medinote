import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppNotifications } from '../../features/notification/hooks';
import { useUserStore } from '../../store/useUserStore';
import type { UserRole } from '../../types/common.types';

interface MenuItem {
  label: string;
  path: string;
  badge?: 'notifications';
}

const userMenus: MenuItem[] = [
  { label: '복약 일정', path: '/app/schedule' },
  { label: '복약 등록', path: '/app/ocr' },
  { label: '챗봇 & 상담', path: '/app/chat' },
  { label: '약 검색', path: '/app/drugs' },
  // { label: 'FAQ', path: '/app/faq' },
  { label: '근처 약국', path: '/app/pharmacies' },
  { label: '알림', path: '/app/notifications', badge: 'notifications' },
  { label: '스마트 약통', path: '/app/iot' },
  { label: '내 정보', path: '/app/my' },
];

const pharmacistMenus: MenuItem[] = [
  { label: '대시보드', path: '/pharmacist/dashboard' },
  { label: '상담 관리', path: '/pharmacist/consults' },
  { label: '환자 조회', path: '/pharmacist/patients' },
  { label: '약 검색', path: '/pharmacist/drugs' },
  { label: '재고 관리', path: '/pharmacist/inventory' },
  {
    label: '알림',
    path: '/pharmacist/notifications',
    badge: 'notifications',
  },
  { label: '약사 마이페이지', path: '/pharmacist/my' },
];

const adminMenus: MenuItem[] = [
  { label: '관리자 대시보드', path: '/admin/dashboard' },
  { label: '회원 관리', path: '/admin/members' },
  { label: '약사 관리', path: '/admin/pharmacists' },
];

function getMenusByRole(role: UserRole | null) {
  if (role === 'PHARMACIST') return pharmacistMenus;
  if (role === 'ADMIN') return adminMenus;
  return userMenus;
}

function getRoleLabel(role: UserRole | null) {
  if (role === 'PHARMACIST') return '약사';
  if (role === 'ADMIN') return '관리자';
  return '사용자';
}


function getRoleActiveNavClass(role: UserRole | null) {
  if (role === 'PHARMACIST') return 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/20';
  if (role === 'ADMIN') return 'bg-slate-700 text-white shadow-sm shadow-slate-700/20';
  return 'bg-blue-700 text-white shadow-sm shadow-blue-700/20';
}

function Sidebar() {
  const navigate = useNavigate();
  const role = useUserStore((state) => state.role);
  const userId = useUserStore((state) => state.userId);
  const status = useUserStore((state) => state.status);
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다.');
    navigate('/login');
  };
  const menus = getMenusByRole(role);
  const notificationRole =
    role === 'USER' || role === 'PHARMACIST' ? role : null;
  const canLoadNotifications =
    role === 'USER' ||
    (role === 'PHARMACIST' &&
      (status === 'ACTIVE' || status === 'APPROVED'));
  const { data: notifications = [] } = useAppNotifications(
    notificationRole,
    {
      enabled: canLoadNotifications && userId !== null,
      userId,
    },
  );
  const unreadNotificationCount = notifications.filter((notification) => {
    if (notification.readAt) {
      return false;
    }

    if (notification.source === 'MEDICATION') {
      return (
        'status' in notification.raw && notification.raw.status === 'SENT'
      );
    }

    return true;
  }).length;

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 px-4 py-5 shadow-[8px_0_30px_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="mb-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <img src="/medinote-logo.svg" alt="Medinote" className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-slate-950">
              Medinote
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {getRoleLabel(role)}
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {menus.map((menu) => {
          const showNotificationBadge =
            menu.badge === 'notifications' && unreadNotificationCount > 0;

          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition',
                  isActive
                    ? getRoleActiveNavClass(role)
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                ].join(' ')
              }
            >
              <span>{menu.label}</span>
              {showNotificationBadge && (
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white"
                  aria-label={`읽지 않은 알림 ${unreadNotificationCount}개`}
                >
                  {unreadNotificationCount > 99
                    ? '99+'
                    : unreadNotificationCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-slate-200/80 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
