import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMedicationScheduleTime } from '../api/schedule.api';

export const useDeleteMedicationScheduleTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMedicationScheduleTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['medication-schedule-times'] });
      queryClient.invalidateQueries({ queryKey: ['daily-medication-schedules'] });
    },
  });
};