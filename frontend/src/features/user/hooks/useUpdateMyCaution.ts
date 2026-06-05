import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyCaution } from '../api/caution.api';
import type { CautionRequest } from '../types/caution.types';

interface UpdateMyCautionParams {
  id: number;
  body: CautionRequest;
}

export const useUpdateMyCaution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: UpdateMyCautionParams) =>
      updateMyCaution(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cautions'] });
    },
  });
};