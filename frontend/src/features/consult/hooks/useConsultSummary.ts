import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateConsultSummary } from '../api/consult.api';

export const useGenerateConsultSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateConsultSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-consult-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['consult-rooms'] });
    },
  });
};