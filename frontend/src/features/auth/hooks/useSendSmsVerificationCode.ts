import { useMutation } from "@tanstack/react-query";
import { sendSmsVerificationCode } from "../api/auth.api";

export const useSendSmsVerificationCode = () => {
  return useMutation({
    mutationFn: sendSmsVerificationCode,
  });
};