import { NavLink } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import type { UserRole } from '../../types/common.types';

interface MenuItem {
  label: string;
  path: string;
}

const userMenus: MenuItem[] = [
  { label: '복약 일정', path: '/app/schedule' },
  { label: '복약 등록', path: '/app/ocr' },
  { label: '챗봇 & 상담', path: '/app/chat' },
  { label: '약 검색', path: '/app/drugs' },
  // { label: 'FAQ', path: '/app/faq' },
  { label: '근처 약국', path: '/app/pharmacies' },
  { label: '알림', path: '/app/notifications' },
  { label: '스마트 약통', path: '/app/iot' },
  { label: '내 정보', path: '/app/my' },
];

const pharmacistMenus: MenuItem[] = [
  { label: '대시보드', path: '/pharmacist/dashboard' },
  { label: '상담 관리', path: '/pharmacist/consults' },
  { label: '환자 조회', path: '/pharmacist/patients' },
  { label: '약 검색', path: '/pharmacist/drugs' },
  { label: '재고 관리', path: '/pharmacist/inventory' },
  { label: '알림', path: '/pharmacist/notifications' },
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

function Sidebar() {
  const role = useUserStore((state) => state.role);
  const menus = getMenusByRole(role);

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-blue-600">AI 복약 도우미</h1>
        <p className="mt-1 text-xs text-slate-500">{role ?? 'USER'}</p>
      </div>

      <nav className="space-y-1">
        {menus.map((menu) => (
          <NavLink
            key={menu.path}
            to={menu.path}
            className={({ isActive }) =>
              [
                'block rounded-xl px-4 py-3 text-sm font-medium transition',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            {menu.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
