import { useQuery } from "@tanstack/react-query";
import { suggestMedicines } from "../api/drug.api";

export const useMedicineSuggest = (keyword: string) => {
  return useQuery({
    queryKey: ["medicine-suggest", keyword],
    queryFn: () => suggestMedicines(keyword),
    enabled: keyword.trim().length > 0,
  });
};