import { useQuery } from "@tanstack/react-query";
import { suggestMyCautions } from "../api/caution.api";
import type { CautionTargetType } from "../types/caution.types";

export const useCautionSuggest = (
  keyword: string,
  type: CautionTargetType
) => {
  return useQuery({
    queryKey: ["my-caution-suggest", keyword, type],
    queryFn: () => suggestMyCautions(keyword, type),
    enabled: keyword.trim().length >= 2,
  });
};