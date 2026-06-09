import { useQuery } from '@tanstack/react-query';

import {
  getActiveConsultRooms,
  getCompletedConsultRooms,
  getPendingConsultRooms,
} from '../api/consult.api';

export const usePendingConsultRooms = () => {
  return useQuery({
    queryKey: ['consult-rooms', 'pending'],
    queryFn: getPendingConsultRooms,
  });
};

export const useActiveConsultRooms = () => {
  return useQuery({
    queryKey: ['consult-rooms', 'active'],
    queryFn: getActiveConsultRooms,
  });
};

export const useCompletedConsultRooms = () => {
  return useQuery({
    queryKey: ['consult-rooms', 'completed'],
    queryFn: getCompletedConsultRooms,
  });
};