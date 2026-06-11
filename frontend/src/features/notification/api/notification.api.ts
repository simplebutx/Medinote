import axios from 'axios';

import {
  consultationInstance,
  medicationInstance,
} from '../../../api/axiosInstance';

import type {
  ConsultationNotification,
  MedicationNotification,
} from '../types';

function isOptionalNotificationApiError(error: unknown) {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 404 || error.response?.status === 500)
  );
}

function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export const getMedicationNotifications = async () => {
  try {
    const response = await medicationInstance.get<MedicationNotification[]>(
      '/api/medication-notifications',
    );

    return response.data;
  } catch (error) {
    if (isOptionalNotificationApiError(error)) {
      return [];
    }

    throw error;
  }
};

export const readMedicationNotification = async (id: number) => {
  const response = await medicationInstance.patch<MedicationNotification>(
    `/api/medication-notifications/${id}/read`,
  );

  return response.data;
};

export const deleteMedicationNotification = async (id: number) => {
  const response = await medicationInstance.delete<void>(
    `/api/medication-notifications/${id}`,
  );

  return response.data;
};

export const deleteAllMedicationNotifications = async () => {
  const response = await medicationInstance.delete<void>(
    '/api/medication-notifications',
  );

  return response.data;
};

export const getConsultationNotifications = async () => {
  try {
    const response = await consultationInstance.get<ConsultationNotification[]>(
      '/api/consultation-notifications',
    );

    return response.data;
  } catch (error) {
    if (isOptionalNotificationApiError(error)) {
      return [];
    }

    throw error;
  }
};

export const readConsultationNotification = async (id: number) => {
  try {
    const response =
      await consultationInstance.patch<ConsultationNotification>(
        `/api/consultation-notifications/${id}/read`,
      );

    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const deleteConsultationNotification = async (id: number) => {
  try {
    const response = await consultationInstance.delete<void>(
      `/api/consultation-notifications/${id}`,
    );

    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    throw error;
  }
};

export const deleteAllConsultationNotifications = async () => {
  try {
    const response = await consultationInstance.delete<void>(
      '/api/consultation-notifications',
    );

    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    throw error;
  }
};