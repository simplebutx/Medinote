import { useMutation } from "@tanstack/react-query";

import { requestPharmacistVerification } from "../api/auth.api";
import type { PharmacistVerificationRequest } from "../types/auth.types";

function usePharmacistVerification() {
  return useMutation({
    mutationFn: (body: PharmacistVerificationRequest) =>
      requestPharmacistVerification(body),
  });
}

export default usePharmacistVerification;