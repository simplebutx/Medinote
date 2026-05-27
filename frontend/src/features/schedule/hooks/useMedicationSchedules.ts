import { useQuery } from "@tanstack/react-query";
import { getMedicationSchedules } from "../api/schedule.api";

export const useMedicationSchedules = () => {
  return useQuery({
    queryKey: ["medication-schedules"],
    queryFn: getMedicationSchedules,
  });
};