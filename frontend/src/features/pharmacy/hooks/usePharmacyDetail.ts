import { useQuery } from '@tanstack/react-query';

import { getPharmacyDetail } from '../api/pharmacy.api';

export const usePharmacyDetail = (hpid?: string | null) => {
  return useQuery({
    queryKey: ['pharmacy-detail', hpid],
    queryFn: () => getPharmacyDetail(hpid as string),
    enabled: Boolean(hpid),
  });
};