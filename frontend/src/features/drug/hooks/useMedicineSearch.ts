import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../../../store/useUserStore";
import { searchMedicines } from "../api/drug.api";

export const useMedicineSearch = (keyword: string) => {
  const accessToken = useUserStore((state) => state.accessToken);
  const userId = useUserStore((state) => state.userId);

  return useQuery({
    queryKey: ["medicine-search", userId, keyword],
    queryFn: () => searchMedicines(keyword),
    enabled: Boolean(accessToken) && keyword.trim().length >= 2,
  });
};
