import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth.api";
import { useUserStore } from "../../../store/useUserStore";

function useLogin() {
  const setLogin = useUserStore((state) => state.setLogin);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setLogin({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role,
        userId: data.userId,
      });
    },
  });
}

export default useLogin;