import axios from 'axios';
import { medicationInstance } from '../../../api/axiosInstance';
import type {
  PrescriptionOcrResponse,
  PrescriptionUploadUrlRequest,
  PrescriptionUploadUrlResponse,
} from '../types/ocr.types';

export const createPrescriptionUploadUrl = async (
  body: PrescriptionUploadUrlRequest,
) => {
  const response = await medicationInstance.post<PrescriptionUploadUrlResponse>(
    '/api/prescriptions/upload-url',
    body,
  );

  return response.data;
};

export const uploadPrescriptionImageToStorage = async ({
  uploadUrl,
  file,
  headers,
}: {
  uploadUrl: string;
  file: File;
  headers?: Record<string, string>;
}) => {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'image/jpeg',
      ...headers,
    },
  });
};

export const runPrescriptionOcr = async (ocrResultId: number) => {
  const response = await medicationInstance.post<PrescriptionOcrResponse>(
    `/api/prescriptions/${ocrResultId}/ocr`,
  );

  return response.data;
};