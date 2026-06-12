import { useQuery } from '@tanstack/react-query';

import {
  getConsultationNotifications,
  getMedicationNotifications,
} from '../api/notification.api';
import type {
  AppNotification,
  ConsultationNotification,
  MedicationNotification,
} from '../types';
import type { UserRole } from '../../../types/common.types';

export const APP_NOTIFICATIONS_QUERY_KEY = ['app-notifications'];

const ENABLE_MEDICATION_NOTIFICATIONS = true;
const ENABLE_CONSULTATION_NOTIFICATIONS = true;

function mapMedicationNotification(
  notification: MedicationNotification,
): AppNotification {
  return {
    id: notification.id,
    source: 'MEDICATION',
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    targetId: notification.medicationScheduleId,
    raw: notification,
  };
}

function mapConsultationNotification(
  notification: ConsultationNotification,
): AppNotification {
  return {
    id: notification.id,
    source: 'CONSULTATION',
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    targetId: notification.consultationSessionId,
    raw: notification,
  };
}

function sortNotifications(notifications: AppNotification[]) {
  return [...notifications].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export const useAppNotifications = (role: UserRole | null) => {
  return useQuery({
    queryKey: [...APP_NOTIFICATIONS_QUERY_KEY, role],
    enabled: Boolean(role),
    retry: false,
    queryFn: async () => {
      if (role === 'PHARMACIST') {
        if (!ENABLE_CONSULTATION_NOTIFICATIONS) {
          return [];
        }

        try {
          const consultationNotifications =
            await getConsultationNotifications();

          return sortNotifications(
            consultationNotifications.map(mapConsultationNotification),
          );
        } catch (error) {
          console.error('상담 알림 조회 실패:', error);
          return [];
        }
      }

      const notifications: AppNotification[] = [];

      if (ENABLE_MEDICATION_NOTIFICATIONS) {
        try {
          const medicationNotifications = await getMedicationNotifications();

          notifications.push(
            ...medicationNotifications.map(mapMedicationNotification),
          );
        } catch (error) {
          console.error('복약 알림 조회 실패:', error);
        }
      }

      if (ENABLE_CONSULTATION_NOTIFICATIONS) {
        try {
          const consultationNotifications =
            await getConsultationNotifications();

          notifications.push(
            ...consultationNotifications.map(mapConsultationNotification),
          );
        } catch (error) {
          console.error('상담 알림 조회 실패:', error);
        }
      }

      return sortNotifications(notifications);
    },
  });
};