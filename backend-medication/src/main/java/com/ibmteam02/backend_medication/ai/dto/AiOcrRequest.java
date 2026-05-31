package com.ibmteam02.backend_medication.ai.dto;

public record AiOcrRequest(
        Long ocrResultId,  // 이 OCR 작업이 누구 건지 식별
        Long userId,  // 권한/추적용
        String imageKey  // 어떤 이미지 파일을 OCR할지 알려주는 S3 경로
) {
}
