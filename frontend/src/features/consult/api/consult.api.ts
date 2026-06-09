import { consultationInstance } from '../../../api/axiosInstance';

import type {
  ConsultFeedbackStats,
  ConsultMessage,
  ConsultPatientInfo,
  ConsultRoom,
} from '../types';

export const getPendingConsultRooms = async () => {
  const response = await consultationInstance.get<ConsultRoom[]>(
    '/app/consult/rooms/pending',
  );

  return response.data;
};

export const getActiveConsultRooms = async () => {
  const response = await consultationInstance.get<ConsultRoom[]>(
    '/app/consult/rooms/active',
  );

  return response.data;
};

export const getCompletedConsultRooms = async () => {
  const response = await consultationInstance.get<ConsultRoom[]>(
    '/app/consult/rooms/completed',
  );

  return response.data;
};

export const matchConsultRoom = async (roomId: number) => {
  const response = await consultationInstance.post<string>(
    `/app/consult/room/${roomId}/match`,
  );

  return response.data;
};

export const getConsultMessages = async (roomId: number) => {
  const response = await consultationInstance.get<ConsultMessage[]>(
    `/app/consult/room/${roomId}/messages`,
  );

  return response.data;
};

export const closeConsultRoom = async (roomId: number) => {
  const response = await consultationInstance.get<void>(
    `/app/consult/room/${roomId}/close`,
  );

  return response.data;
};

export const getConsultPatientInfo = async (roomId: number) => {
  const response = await consultationInstance.get<ConsultPatientInfo>(
    `/app/consult/room/${roomId}/patient-info`,
  );

  return response.data;
};

export const getConsultFeedbackStats = async () => {
  const response = await consultationInstance.get<ConsultFeedbackStats>(
    '/app/consult/rooms/feedback-stats',
  );

  return response.data;
};