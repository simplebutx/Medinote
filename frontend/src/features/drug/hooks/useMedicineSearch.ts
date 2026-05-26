import { useQuery } from "@tanstack/react-query";
import { searchMedicines } from "../api/drug.api";

export const useMedicineSearch = (keyword: string) => {
  return useQuery({
    queryKey: ["medicine-search", keyword],
    queryFn: () => searchMedicines(keyword),
    enabled: keyword.trim().length >= 2,
  });
};