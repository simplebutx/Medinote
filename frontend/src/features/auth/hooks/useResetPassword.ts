import { useMutation } from '@tanstack/react-query';

import { resetPassword } from '../api/auth.api';

export const useResetPassword = () => {
  return useMutation({
    mutationFn: resetPassword,
  });
};
