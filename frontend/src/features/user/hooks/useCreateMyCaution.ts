import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMyCaution } from "../api/caution.api";

export const useCreateMyCaution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMyCaution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cautions"] });
    },
  });
};