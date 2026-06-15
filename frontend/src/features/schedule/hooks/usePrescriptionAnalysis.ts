import { useMutation } from '@tanstack/react-query';
import { analyzePrescription } from '../api/schedule.api';

export const usePrescriptionAnalysis = () => {
  return useMutation({
    mutationFn: analyzePrescription,
  });
};
