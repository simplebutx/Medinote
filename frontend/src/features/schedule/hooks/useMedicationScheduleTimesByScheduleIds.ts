import { useQuery } from '@tanstack/react-query';
import { getMedicationScheduleTimesByScheduleIds } from '../api/schedule.api';

export const useMedicationScheduleTimesByScheduleIds = (
  medicationScheduleIds: number[],
) => {
  return useQuery({
    queryKey: ['medication-schedule-times', medicationScheduleIds],
    queryFn: () => getMedicationScheduleTimesByScheduleIds(medicationScheduleIds),
    enabled: medicationScheduleIds.length > 0,
  });
};