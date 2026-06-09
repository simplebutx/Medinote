import { useQuery } from '@tanstack/react-query';
import { getMedicineSyncStatus } from '../api/admin.api';

export const useMedicineSyncStatus = () => {
  return useQuery({
    queryKey: ['medicine-sync-status'],
    queryFn: getMedicineSyncStatus,
  });
};