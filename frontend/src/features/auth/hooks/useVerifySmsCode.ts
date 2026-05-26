import { useMutation } from "@tanstack/react-query";
import { verifySmsCode } from "../api/auth.api";

export const useVerifySmsCode = () => {
  return useMutation({
    mutationFn: verifySmsCode,
  });
};