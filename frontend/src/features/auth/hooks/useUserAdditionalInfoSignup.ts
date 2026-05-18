import { useMutation } from "@tanstack/react-query";
import { registerUserAdditionalInfo } from "../api/auth.api";

function useUserAdditionalInfoSignup() {
  return useMutation({
    mutationFn: registerUserAdditionalInfo,
  });
}

export default useUserAdditionalInfoSignup;