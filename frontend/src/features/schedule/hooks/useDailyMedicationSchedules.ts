import { useQuery } from "@tanstack/react-query";
import { getDailyMedicationSchedules } from "../api/schedule.api";

export const useDailyMedicationSchedules = (date: string) => {
  return useQuery({
    queryKey: ["daily-Medication-Schedules", date],
    queryFn: () => getDailyMedicationSchedules(date),
    enabled: Boolean(date),
  });
};