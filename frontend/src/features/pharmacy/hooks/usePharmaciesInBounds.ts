import { useQuery } from '@tanstack/react-query';

import { getPharmaciesInBounds } from '../api/pharmacy.api';
import type { PharmacyBoundsParams } from '../types';

export const usePharmaciesInBounds = (params: PharmacyBoundsParams) => {
  return useQuery({
    queryKey: ['pharmacies-in-bounds', params],
    queryFn: () => getPharmaciesInBounds(params),
  });
};