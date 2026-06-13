export interface PrescriptionUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface PrescriptionUploadUrlResponse {
  uploadUrl: string;
  key: string;
  fileUrl: string;
  headers?: Record<string, string>;
  ocrResultId?: number;
  id?: number;
}

export interface PrescriptionOcrResponse {
  id?: number;
  ocrResultId?: number;
  userId?: number;
  resultJson?: string | Record<string, unknown> | null;
  status?: string;
  errorMessage?: string | null;
}
