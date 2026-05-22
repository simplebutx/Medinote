import { useMutation } from "@tanstack/react-query";

import { signupUserAdditionalInfo } from "../api/auth.api";
import type { UserAdditionalInfoRequest } from "../types/auth.types";

function useUserAdditionalInfoSignup() {
  return useMutation({
    mutationFn: (body: UserAdditionalInfoRequest) =>
      signupUserAdditionalInfo(body),
  });
}

export default useUserAdditionalInfoSignup;