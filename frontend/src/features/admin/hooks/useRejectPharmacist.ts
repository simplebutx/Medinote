import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectPharmacist } from '../api/admin.api';

export const useRejectPharmacist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectPharmacist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-pharmacists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};