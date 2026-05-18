import { useMutation } from "@tanstack/react-query";
import { verifyEmailCode } from "../api/auth.api";

function useVerifyEmailCode() {
  return useMutation({
    mutationFn: verifyEmailCode,
  });
}

export default useVerifyEmailCode;