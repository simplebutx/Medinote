import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button, Input } from "../../../components/ui";
import { useUserStore } from "../../../store/useUserStore";
import type { UserRole } from "../../../types/common.types";
import useLogin from "../hooks/useLogin";

function getRedirectPath(role: UserRole) {
  if (role === "USER") return "/app/schedule";
  if (role === "PHARMACIST") return "/pharmacist/dashboard";
  return "/admin/dashboard";
}

function LoginForm() {
  const navigate = useNavigate();
  const setLogin = useUserStore((state) => state.setLogin);
  const loginMutation = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          toast.success("로그인 성공");
          navigate(getRedirectPath(data.role));
        },
        onError: () => {
          toast.error("로그인에 실패했습니다. 임시 로그인으로 테스트할 수 있어요.");
        },
      }
    );
  };

  const handleMockLogin = (role: UserRole) => {
    setLogin({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      role,
      userId: 1,
    });

    toast.success(`${role} 임시 로그인`);
    navigate(getRedirectPath(role));
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">
        로그인
      </h1>

      <p className="mb-6 text-sm text-slate-500">
        이메일과 비밀번호를 입력해 로그인하세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="이메일"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Input
          label="비밀번호"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="my-6 border-t border-slate-200" />

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          개발용 임시 로그인
        </p>

        <Button
          type="button"
          variant="ghost"
          className="w-full border border-slate-200"
          onClick={() => handleMockLogin("USER")}
        >
          임시 사용자 로그인
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full border border-slate-200"
          onClick={() => handleMockLogin("PHARMACIST")}
        >
          임시 약사 로그인
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full border border-slate-200"
          onClick={() => handleMockLogin("ADMIN")}
        >
          임시 관리자 로그인
        </Button>
      </div>
    </div>
  );
}

export default LoginForm;