import { useQuery } from '@tanstack/react-query';

import { searchPharmaciesByMedicine } from '../api/pharmacy.api';
import type { PharmacyMedicineSearchParams } from '../types';

export const useSearchPharmaciesByMedicine = (
  params: PharmacyMedicineSearchParams,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ['pharmacies-by-medicine', params],
    queryFn: () => searchPharmaciesByMedicine(params),
    enabled,
  });
};