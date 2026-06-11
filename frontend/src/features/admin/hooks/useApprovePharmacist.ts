import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approvePharmacist } from '../api/admin.api';

export const useApprovePharmacist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvePharmacist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-pharmacists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};