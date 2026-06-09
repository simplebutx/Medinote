import { useQuery } from '@tanstack/react-query';
import { getMedicationTimePresets } from '../api/schedule.api';

export const useMedicationTimePresets = () => {
  return useQuery({
    queryKey: ['medication-time-presets'],
    queryFn: getMedicationTimePresets,
  });
};