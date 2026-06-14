import { useQuery } from '@tanstack/react-query';
import {
  getSmartPillDevices,
  getSmartPillHealth,
  getSmartPillSlotAssignments,
  getSmartPillStatus,
} from '../api/smartpill.api';

export const useSmartPillHealth = () => {
  return useQuery({
    queryKey: ['smartpill-health'],
    queryFn: getSmartPillHealth,
    refetchInterval: 30_000,
    retry: false,
  });
};

export const useSmartPillStatus = () => {
  return useQuery({
    queryKey: ['smartpill-status'],
    queryFn: getSmartPillStatus,
    refetchInterval: 2_000,
    retry: false,
  });
};

export const useSmartPillDevices = () => {
  return useQuery({
    queryKey: ['smartpill-devices'],
    queryFn: getSmartPillDevices,
    retry: false,
  });
};

export const useSmartPillSlotAssignments = (deviceId?: string | null) => {
  return useQuery({
    queryKey: ['smartpill-slot-assignments', deviceId],
    queryFn: () => getSmartPillSlotAssignments(deviceId as string),
    enabled: Boolean(deviceId),
    retry: false,
  });
};
