import { useMutation } from "@tanstack/react-query";
import { sendEmailVerificationCode } from "../api/auth.api";

function useSendEmailVerificationCode() {
  return useMutation({
    mutationFn: sendEmailVerificationCode,
  });
}

export default useSendEmailVerificationCode;