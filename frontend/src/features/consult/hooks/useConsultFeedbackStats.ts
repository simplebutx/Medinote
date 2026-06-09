import { useQuery } from '@tanstack/react-query';

import { getConsultFeedbackStats } from '../api/consult.api';

export const useConsultFeedbackStats = () => {
  return useQuery({
    queryKey: ['consult-feedback-stats'],
    queryFn: getConsultFeedbackStats,
  });
};