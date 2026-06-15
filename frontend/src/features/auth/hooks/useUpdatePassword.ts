import { useMutation } from '@tanstack/react-query';

import { updatePassword } from '../api/auth.api';

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: updatePassword,
  });
};
