import { useMutation, useQueryClient } from '@tanstack/react-query';

import { upsertPharmacyInventory } from '../api/pharmacy.api';

export const useUpsertPharmacyInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertPharmacyInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-inventory'] });
    },
  });
};