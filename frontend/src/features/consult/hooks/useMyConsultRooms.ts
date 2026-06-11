import { useQuery } from '@tanstack/react-query';

import { getMyConsultRooms } from '../api/consult.api';

export const useMyConsultRooms = (enabled = true) => {
  return useQuery({
    queryKey: ['my-consult-rooms'],
    queryFn: getMyConsultRooms,
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
};