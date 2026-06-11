import { useQuery } from '@tanstack/react-query';
import { getAdminUsers } from '../api/admin.api';

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  });
};