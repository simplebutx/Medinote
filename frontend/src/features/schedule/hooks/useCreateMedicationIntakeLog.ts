import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMedicationIntakeLog } from "../api/schedule.api";

export const useCreateMedicationIntakeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMedicationIntakeLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["medication-intake-logs"] });
    },
  });
};