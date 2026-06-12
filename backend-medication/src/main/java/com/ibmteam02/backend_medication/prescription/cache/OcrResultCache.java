package com.ibmteam02.backend_medication.prescription.cache;

import com.ibmteam02.backend_medication.prescription.domain.OcrResultStatus;
import java.time.LocalDateTime;

// redis에 저장할 ocr 작업 데이터 객체
public record OcrResultCache(
        Long ocrResultId,
        Long userId,
        String imageKey,
        String resultJson,
        OcrResultStatus status,
        String errorMessage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    // 상태값 바꾸고 새 객체 생성 (추후 덮어쓰기)
    public OcrResultCache processing(LocalDateTime updatedAt) {
        return new OcrResultCache(
                ocrResultId,
                userId,
                imageKey,
                resultJson,
                OcrResultStatus.OCR_PROCESSING,
                null,
                createdAt,
                updatedAt
        );
    }

    public OcrResultCache success(String resultJson, LocalDateTime updatedAt) {
        return new OcrResultCache(
                ocrResultId,
                userId,
                imageKey,
                resultJson,
                OcrResultStatus.OCR_DONE,
                null,
                createdAt,
                updatedAt
        );
    }

    public OcrResultCache failed(String errorMessage, LocalDateTime updatedAt) {
        return new OcrResultCache(
                ocrResultId,
                userId,
                imageKey,
                resultJson,
                OcrResultStatus.OCR_FAILED,
                errorMessage,
                createdAt,
                updatedAt
        );
    }
}
