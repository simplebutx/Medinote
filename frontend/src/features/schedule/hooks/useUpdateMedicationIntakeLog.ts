import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMedicationIntakeLog } from "../api/schedule.api";

export const useUpdateMedicationIntakeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Parameters<typeof updateMedicationIntakeLog>[1];
    }) => updateMedicationIntakeLog(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-intake-logs"] });
    },
  });
};