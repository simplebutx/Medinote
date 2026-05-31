import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMedicationScheduleTime } from "../api/schedule.api";

export const useCreateMedicationScheduleTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMedicationScheduleTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-schedule-times"] });
    },
  });
};