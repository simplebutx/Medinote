import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';

function PharmacistGuard() {
  const role = useUserStore((state) => state.role);
  const status = useUserStore((state) => state.status);

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'PHARMACIST') {
    return <Navigate to="/" replace />;
  }

  const isApprovedPharmacist = status === 'ACTIVE' || status === 'APPROVED';

  if (!isApprovedPharmacist) {
    return <Navigate to="/pharmacist/pending" replace />;
  }

  return <Outlet />;
}

export default PharmacistGuard;
