import { useMutation } from '@tanstack/react-query';
import { createPrescriptionUploadUrl } from '../api/ocr.api';

export const usePrescriptionUploadUrl = () => {
  return useMutation({
    mutationFn: createPrescriptionUploadUrl,
  });
};