import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import type { UserRole } from '../../types/common.types';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const role = useUserStore((state) => state.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
