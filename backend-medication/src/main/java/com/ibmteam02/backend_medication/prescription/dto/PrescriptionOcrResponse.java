package com.ibmteam02.backend_medication.prescription.dto;

import com.ibmteam02.backend_medication.prescription.domain.OcrResultStatus;

public record PrescriptionOcrResponse(
        Long ocrResultId,
        String imageKey,
        String rawText,
        String resultJson,
        String ocrEngine,
        String preprocessedImageDataUrl,
        OcrResultStatus status,
        String errorMessage
) {
}
