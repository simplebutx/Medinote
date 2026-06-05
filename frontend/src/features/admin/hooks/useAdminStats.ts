import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../api/admin.api';

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });
};