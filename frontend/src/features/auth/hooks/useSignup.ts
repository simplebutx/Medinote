import { useMutation } from "@tanstack/react-query";
import { signup } from "../api/auth.api";

function useSignup() {
  return useMutation({
    mutationFn: signup,
  });
}

export default useSignup;