import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createConsultRoom } from '../api/consult.api';

export const useCreateConsultRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConsultRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-consult-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['consult-rooms'] });
    },
  });
};