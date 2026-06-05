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
  imageKey?: string;
  rawText?: string | null;
  resultJson?: string | Record<string, unknown> | null;
  preprocessedImageDataUrl?: string | null;
  status?: string;
  errorMessage?: string | null;
  ocrEngine?: string | null;
}
