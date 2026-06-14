import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pauseSmartPillDetection,
  resetSmartPillConnection,
  saveSmartPillSlotAssignments,
  startSmartPillDetection,
} from '../api/smartpill.api';

function useSmartPillAssignmentMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpill-devices'] });
      queryClient.invalidateQueries({
        queryKey: ['smartpill-slot-assignments'],
      });
    },
  });
}

export const useSaveSmartPillSlotAssignments = () => {
  return useSmartPillAssignmentMutation(saveSmartPillSlotAssignments);
};

export const useStartSmartPillDetection = () => {
  return useSmartPillAssignmentMutation(startSmartPillDetection);
};

export const usePauseSmartPillDetection = () => {
  return useSmartPillAssignmentMutation(pauseSmartPillDetection);
};

export const useResetSmartPillConnection = () => {
  return useSmartPillAssignmentMutation(resetSmartPillConnection);
};
