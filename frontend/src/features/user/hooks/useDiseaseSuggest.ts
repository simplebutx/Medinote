import { useQuery } from '@tanstack/react-query';
import { suggestDiseases } from '../api/profile.api';

export const useDiseaseSuggest = (keyword: string) => {
  return useQuery({
    queryKey: ['disease-suggestions', keyword],
    queryFn: () => suggestDiseases(keyword),
    enabled: keyword.trim().length >= 2,
  });
};