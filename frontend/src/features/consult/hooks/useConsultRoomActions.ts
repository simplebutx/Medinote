import { useMutation, useQueryClient } from '@tanstack/react-query';

import { closeConsultRoom, matchConsultRoom } from '../api/consult.api';

export const useMatchConsultRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: matchConsultRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consult-rooms'] });
    },
  });
};

export const useCloseConsultRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeConsultRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consult-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['my-consult-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['consult-messages'] });
    },
  });
};
