import { useUserStore } from "../../store/useUserStore";

function getRoleLabel(role: string | null) {
  if (role === "PHARMACIST") return "약사";
  if (role === "ADMIN") return "관리자";
  if (role === "USER") return "사용자";
  return "비로그인";
}

function getRoleBadgeClass(role: string | null) {
  if (role === "PHARMACIST")
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  if (role === "ADMIN")
    return "border-slate-300 bg-slate-100 text-slate-800";
  return "border-blue-300 bg-blue-100 text-blue-900";
}

function Topbar() {
  const role = useUserStore((state) => state.role);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/95 px-6 shadow-sm backdrop-blur-xl lg:px-8">
      <span
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
          getRoleBadgeClass(role),
        ].join(" ")}
      >
        {getRoleLabel(role)}
      </span>
    </header>
  );
}

export default Topbar;
