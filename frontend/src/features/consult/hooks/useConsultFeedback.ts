import { useMutation, useQueryClient } from '@tanstack/react-query';

import { submitConsultFeedback } from '../api/consult.api';

export const useSubmitConsultFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitConsultFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-consult-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['consult-rooms'] });
    },
  });
};