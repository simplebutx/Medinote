import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyPharmacistProfile } from '../api/profile.api';

export const useUpdateMyPharmacistProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyPharmacistProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
};