import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMedicationTimePresets } from '../api/schedule.api';
import type { UpdateMedicationTimePresetsRequest } from '../types/schedule.types';

export const useUpdateMedicationTimePresets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateMedicationTimePresetsRequest) =>
      updateMedicationTimePresets(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-time-presets'] });
    },
  });
};