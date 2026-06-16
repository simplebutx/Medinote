import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-20">
      <Outlet />
    </div>
  );
}

export default AuthLayout;
