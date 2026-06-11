import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncMedicines } from '../api/admin.api';

export const useSyncMedicines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncMedicines,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-search'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-suggest'] });
    },
  });
};