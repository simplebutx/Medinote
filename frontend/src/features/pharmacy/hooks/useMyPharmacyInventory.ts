import { useQuery } from '@tanstack/react-query';

import { getMyPharmacyInventory } from '../api/pharmacy.api';

export const useMyPharmacyInventory = () => {
  return useQuery({
    queryKey: ['my-pharmacy-inventory'],
    queryFn: getMyPharmacyInventory,
  });
};