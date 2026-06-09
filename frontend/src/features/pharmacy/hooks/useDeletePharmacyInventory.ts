import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deletePharmacyInventory } from '../api/pharmacy.api';

export const useDeletePharmacyInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePharmacyInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-inventory'] });
    },
  });
};