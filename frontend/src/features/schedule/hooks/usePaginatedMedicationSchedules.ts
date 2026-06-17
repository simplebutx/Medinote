import { useQuery } from "@tanstack/react-query";
import { getPaginatedMedicationSchedules } from "../api/schedule.api";

export const usePaginatedMedicationSchedules = (page: number, size = 5) => {
  return useQuery({
    queryKey: ["medication-schedules-paged", page, size],
    queryFn: () => getPaginatedMedicationSchedules(page, size),
  });
};
