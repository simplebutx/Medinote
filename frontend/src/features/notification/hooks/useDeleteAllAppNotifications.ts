import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteAllConsultationNotifications,
  deleteAllMedicationNotifications,
} from '../api/notification.api';
import type { UserRole } from '../../../types/common.types';
import { APP_NOTIFICATIONS_QUERY_KEY } from './useAppNotifications';

export const useDeleteAllAppNotifications = (role: UserRole | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (role === 'PHARMACIST') {
        await deleteAllConsultationNotifications();
        return;
      }

      await Promise.allSettled([
        deleteAllMedicationNotifications(),
        deleteAllConsultationNotifications(),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: APP_NOTIFICATIONS_QUERY_KEY,
      });
    },
  });
};