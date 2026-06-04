import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMedicationSchedule } from '../api/schedule.api';
import type { CreateMedicationScheduleRequest } from '../types/schedule.types';

interface UpdateMedicationScheduleParams {
  id: number;
  body: CreateMedicationScheduleRequest;
}

export const useUpdateMedicationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: UpdateMedicationScheduleParams) =>
      updateMedicationSchedule(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['daily-medication-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['medication-schedule-times'] });
    },
  });
};