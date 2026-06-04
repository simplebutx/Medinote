import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '../api/profile.api';

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
};