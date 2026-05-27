import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMedicationIntakeLog } from "../api/schedule.api";

export const useDeleteMedicationIntakeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMedicationIntakeLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["medication-intake-logs"] });
    },
  });
};