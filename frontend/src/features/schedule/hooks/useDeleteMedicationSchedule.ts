import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMedicationSchedule } from '../api/schedule.api';

export const useDeleteMedicationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMedicationSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['daily-medication-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['medication-schedule-times'] });
    },
  });
};