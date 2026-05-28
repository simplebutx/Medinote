import { useQuery } from "@tanstack/react-query";
import { getMedicationScheduleTimes } from "../api/schedule.api";

export const useMedicationScheduleTimes = (medicationScheduleId?: number) => {
  return useQuery({
    queryKey: ["medication-schedule-times", medicationScheduleId],
    queryFn: () => getMedicationScheduleTimes(medicationScheduleId as number),
    enabled: Boolean(medicationScheduleId),
  });
};