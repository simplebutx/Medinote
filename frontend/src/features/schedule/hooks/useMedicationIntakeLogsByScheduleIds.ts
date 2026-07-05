import { useQuery } from '@tanstack/react-query';
import { getMedicationIntakeLogsByScheduleIds } from '../api/schedule.api';

export const useMedicationIntakeLogsByScheduleIds = (
  medicationScheduleIds: number[],
) => {
  return useQuery({
    queryKey: ['medication-intake-logs', medicationScheduleIds],
    queryFn: () => getMedicationIntakeLogsByScheduleIds(medicationScheduleIds),
    enabled: medicationScheduleIds.length > 0,
    refetchInterval: 2_000,
  });
};
