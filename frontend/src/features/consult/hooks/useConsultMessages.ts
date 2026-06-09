import { useQuery } from '@tanstack/react-query';

import { getConsultMessages } from '../api/consult.api';

export const useConsultMessages = (roomId?: number | null) => {
  return useQuery({
    queryKey: ['consult-messages', roomId],
    queryFn: () => getConsultMessages(roomId as number),
    enabled: typeof roomId === 'number',
  });
};