import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteConsultationNotification,
  deleteMedicationNotification,
} from '../api/notification.api';
import type { AppNotification } from '../types';
import { APP_NOTIFICATIONS_QUERY_KEY } from './useAppNotifications';

export const useDeleteAppNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notification: AppNotification) => {
      if (notification.source === 'MEDICATION') {
        return deleteMedicationNotification(notification.id);
      }

      return deleteConsultationNotification(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: APP_NOTIFICATIONS_QUERY_KEY,
      });
    },
  });
};