import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMedicationSchedule } from "../api/schedule.api";

export const useCreateMedicationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMedicationSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-schedules"] });
    },
  });
};