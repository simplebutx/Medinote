import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getMyProfile } from "../../features/user/api/profile.api";
import { useUserStore } from "../../store/useUserStore";
import type { UserRole } from "../../types/common.types";

function normalizeRole(role?: string | null): UserRole | null {
  const normalizedRole = role?.replace(/^ROLE_/, "");

  if (
    normalizedRole === "USER" ||
    normalizedRole === "PHARMACIST" ||
    normalizedRole === "ADMIN"
  ) {
    return normalizedRole;
  }

  return null;
}

function getRedirectPath(role: UserRole) {
  if (role === "USER") return "/app/schedule";
  if (role === "PHARMACIST") return "/pharmacist/dashboard";
  return "/admin/dashboard";
}

function getProfileUserId(profile: {
  id?: number | string | null;
  userId?: number | string | null;
  user_id?: number | string | null;
}) {
  const value = profile.id ?? profile.userId ?? profile.user_id;
  const userId = Number(value);

  return Number.isFinite(userId) ? userId : 0;
}

function OAuth2RedirectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setLogin = useUserStore((state) => state.setLogin);
  const hasStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const completeSocialLogin = async () => {
      try {
        const profile = await getMyProfile(token);
        const role = normalizeRole(profile.role);

        if (!role) {
          throw new Error("로그인 계정의 역할을 확인할 수 없습니다.");
        }

        setLogin({
          accessToken: token,
          refreshToken: "",
          role,
          userId: getProfileUserId(profile),
          status: profile.status ?? null,
        });

        navigate(getRedirectPath(role), { replace: true });
      } catch (error) {
        console.error("소셜 로그인 사용자 정보 조회 실패:", error);
        setErrorMessage(
          "소셜 로그인 정보를 확인하지 못했습니다. 로그인 페이지에서 다시 시도해주세요.",
        );
      }
    };

    void completeSocialLogin();
  }, [navigate, searchParams, setLogin]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 size-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      <h1 className="text-xl font-bold text-slate-900">
        {errorMessage ? "로그인 확인 실패" : "소셜 로그인 처리 중"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {errorMessage || "계정 정보를 확인하고 있습니다. 잠시만 기다려주세요."}
      </p>
      {errorMessage && (
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          로그인으로 돌아가기
        </button>
      )}
    </div>
  );
}

export default OAuth2RedirectPage;
