export type NotificationSource = 'MEDICATION' | 'CONSULTATION';

export interface MedicationNotification {
  id: number;
  userId: number;
  medicationScheduleId: number | null;
  medicationScheduleMedicineId: number | null;
  medicationScheduleTimeId: number | null;
  type: string | null;
  title: string;
  body: string;
  status: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ConsultationNotification {
  id: number;
  receiverId: number;
  senderId: number | null;
  consultationSessionId: number | null;
  consultationMessageId: number | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AppNotification {
  id: number;
  source: NotificationSource;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  targetId: number | null;
  raw: MedicationNotification | ConsultationNotification;
}