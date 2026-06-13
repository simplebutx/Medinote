import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUserStore } from "../../store/useUserStore";

function Topbar() {
  const navigate = useNavigate();
  const role = useUserStore((state) => state.role);
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    toast.success("로그아웃되었습니다.");
    navigate("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <p className="text-sm text-slate-500">현재 역할</p>
        <p className="font-semibold text-slate-900">{role ?? "비로그인"}</p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        로그아웃
      </button>
    </header>
  );
}

export default Topbar;
