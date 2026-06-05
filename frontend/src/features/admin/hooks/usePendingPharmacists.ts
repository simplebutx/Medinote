import { useQuery } from '@tanstack/react-query';
import { getPendingPharmacists } from '../api/admin.api';

export const usePendingPharmacists = () => {
  return useQuery({
    queryKey: ['pending-pharmacists'],
    queryFn: getPendingPharmacists,
  });
};