import { useMutation } from "@tanstack/react-query";
import { registerPharmacistVerification } from "../api/auth.api";

function usePharmacistVerification() {
  return useMutation({
    mutationFn: registerPharmacistVerification,
  });
}

export default usePharmacistVerification;