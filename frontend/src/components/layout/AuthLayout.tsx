import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <Outlet />
    </div>
  );
}

export default AuthLayout;