import { useMutation } from '@tanstack/react-query';
import { runPrescriptionOcr } from '../api/ocr.api';

export const useRunPrescriptionOcr = () => {
  return useMutation({
    mutationFn: runPrescriptionOcr,
  });
};