import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updatePharmacy } from '../api/pharmacy.api';

export const useUpdatePharmacy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePharmacy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-inventory'] });
    },
  });
};