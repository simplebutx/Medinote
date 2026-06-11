import { useQuery } from '@tanstack/react-query';

import { getConsultPatientInfo } from '../api/consult.api';

export const useConsultPatientInfo = (roomId?: number | null) => {
  return useQuery({
    queryKey: ['consult-patient-info', roomId],
    queryFn: () => getConsultPatientInfo(roomId as number),
    enabled: typeof roomId === 'number',
  });
};