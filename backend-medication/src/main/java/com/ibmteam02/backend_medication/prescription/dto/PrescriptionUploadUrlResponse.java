package com.ibmteam02.backend_medication.prescription.dto;

import java.util.Map;

public record PrescriptionUploadUrlResponse(
        Long ocrResultId,
        String uploadUrl,
        String key,
        String fileUrl,   // 파일 접근할때 사용할 url
        Map<String, String> headers   // 업로드 요청에 포함할 헤더
) {
}
