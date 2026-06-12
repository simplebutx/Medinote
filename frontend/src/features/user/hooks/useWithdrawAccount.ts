import { useMutation, useQueryClient } from '@tanstack/react-query';
import { withdrawAccount } from '../api/profile.api';
import { useUserStore } from '../../../store/useUserStore';

export const useWithdrawAccount = () => {
  const queryClient = useQueryClient();
  const logout = useUserStore((state) => state.logout);

  return useMutation({
    mutationFn: withdrawAccount,
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
};