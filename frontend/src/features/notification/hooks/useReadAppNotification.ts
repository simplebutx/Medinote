import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  readConsultationNotification,
  readMedicationNotification,
} from '../api/notification.api';
import type { AppNotification } from '../types';
import { APP_NOTIFICATIONS_QUERY_KEY } from './useAppNotifications';

export const useReadAppNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notification: AppNotification) => {
      if (notification.source === 'MEDICATION') {
        return readMedicationNotification(notification.id);
      }

      return readConsultationNotification(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: APP_NOTIFICATIONS_QUERY_KEY,
      });
    },
  });
};