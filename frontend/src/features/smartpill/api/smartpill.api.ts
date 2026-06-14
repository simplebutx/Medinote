import {
  medicationInstance,
  publicMedicationInstance,
} from '../../../api/axiosInstance';
import type {
  SaveSmartPillSlotAssignmentsRequest,
  SmartPillDevice,
  SmartPillIntakeEventRequest,
  SmartPillIntakeEventResponse,
  SmartPillSlotAssignmentResponse,
  SmartPillStatusResponse,
} from '../types/smartpill.types';

export const getSmartPillHealth = async () => {
  const response = await publicMedicationInstance.get<string>(
    '/api/smartpill/test/health',
  );

  return response.data;
};

export const getSmartPillStatus = async () => {
  const response = await publicMedicationInstance.get<SmartPillStatusResponse>(
    '/api/smartpill/test/status',
  );

  return response.data;
};

export const sendSmartPillIntakeEvent = async (
  body: SmartPillIntakeEventRequest,
) => {
  const response =
    await publicMedicationInstance.post<SmartPillIntakeEventResponse>(
      '/api/smartpill/test/intake-events',
      body,
    );

  return response.data;
};

export const getSmartPillDevices = async () => {
  const response = await medicationInstance.get<SmartPillDevice[]>(
    '/api/smartpill/devices',
  );

  return response.data;
};

export const getSmartPillSlotAssignments = async (deviceId: string) => {
  const response =
    await medicationInstance.get<SmartPillSlotAssignmentResponse>(
      `/api/smartpill/devices/${encodeURIComponent(deviceId)}/slot-assignments`,
    );

  return response.data;
};

export const saveSmartPillSlotAssignments = async ({
  deviceId,
  body,
}: {
  deviceId: string;
  body: SaveSmartPillSlotAssignmentsRequest;
}) => {
  const response =
    await medicationInstance.put<SmartPillSlotAssignmentResponse>(
      `/api/smartpill/devices/${encodeURIComponent(deviceId)}/slot-assignments`,
      body,
    );

  return response.data;
};

export const startSmartPillDetection = async (deviceId: string) => {
  const response =
    await medicationInstance.post<SmartPillSlotAssignmentResponse>(
      `/api/smartpill/devices/${encodeURIComponent(deviceId)}/start-detection`,
    );

  return response.data;
};

export const pauseSmartPillDetection = async (deviceId: string) => {
  const response =
    await medicationInstance.post<SmartPillSlotAssignmentResponse>(
      `/api/smartpill/devices/${encodeURIComponent(deviceId)}/pause-detection`,
    );

  return response.data;
};

export const resetSmartPillConnection = async (deviceId: string) => {
  const response =
    await medicationInstance.post<SmartPillSlotAssignmentResponse>(
      `/api/smartpill/devices/${encodeURIComponent(deviceId)}/reset`,
    );

  return response.data;
};
