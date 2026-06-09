import { useMutation, useQueryClient } from '@tanstack/react-query';

import { registerPharmacy } from '../api/pharmacy.api';

export const useRegisterPharmacy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerPharmacy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-inventory'] });
    },
  });
};