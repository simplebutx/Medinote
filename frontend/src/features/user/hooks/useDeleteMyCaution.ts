import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMyCaution } from "../api/caution.api";

export const useDeleteMyCaution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMyCaution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cautions"] });
    },
  });
};