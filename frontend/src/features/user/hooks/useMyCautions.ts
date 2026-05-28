import { useQuery } from "@tanstack/react-query";
import { getMyCautions } from "../api/caution.api";

export const useMyCautions = () => {
  return useQuery({
    queryKey: ["my-cautions"],
    queryFn: getMyCautions,
  });
};