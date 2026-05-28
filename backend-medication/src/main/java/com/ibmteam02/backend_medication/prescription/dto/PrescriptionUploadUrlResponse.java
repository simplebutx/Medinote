package com.ibmteam02.backend_medication.prescription.dto;

import java.util.Map;

public record PrescriptionUploadUrlResponse(
        Long ocrResultId,
        String uploadUrl,
        String key,
        String fileUrl,
        Map<String, String> headers
) {
}
