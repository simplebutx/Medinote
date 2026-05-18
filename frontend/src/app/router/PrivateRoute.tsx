import { Navigate, Outlet } from "react-router-dom";
import { useUserStore } from "../../store/useUserStore";

function PrivateRoute() {
  const accessToken = useUserStore((state) => state.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;