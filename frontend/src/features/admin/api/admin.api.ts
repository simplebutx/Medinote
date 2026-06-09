import {
  authInstance,
  medicationInstance,
} from '../../../api/axiosInstance';
import type {
  AdminStats,
  AdminUser,
  MedicineSyncResult,
  MedicineSyncStatus,
  PendingPharmacist,
} from '../types/admin.types';

export const getAdminStats = async () => {
  const response = await authInstance.get<AdminStats>('/api/admin/stats');

  return response.data;
};

export const getPendingPharmacists = async () => {
  const response = await authInstance.get<PendingPharmacist[]>(
    '/api/admin/pharmacists/pending',
  );

  return response.data;
};

export const approvePharmacist = async (userId: number) => {
  const response = await authInstance.post<string>(
    `/api/admin/pharmacists/${userId}/approve`,
  );

  return response.data;
};

export const rejectPharmacist = async (userId: number) => {
  const response = await authInstance.post<string>(
    `/api/admin/pharmacists/${userId}/reject`,
  );

  return response.data;
};

export const getAdminUsers = async () => {
  const response = await authInstance.get<AdminUser[]>('/api/admin/users');

  return response.data;
};

export const deleteAdminUser = async (userId: number) => {
  const response = await authInstance.delete<string>(
    `/api/admin/users/${userId}`,
  );

  return response.data;
};

export const getMedicineSyncStatus = async () => {
  const response = await medicationInstance.get<MedicineSyncStatus>(
    '/api/medicines/sync-status',
  );

  return response.data;
};

export const syncMedicines = async () => {
  const response = await medicationInstance.post<MedicineSyncResult | string>(
    '/api/medicines/sync',
  );

  return response.data;
};