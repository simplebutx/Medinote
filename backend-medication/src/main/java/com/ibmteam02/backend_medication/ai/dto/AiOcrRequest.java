package com.ibmteam02.backend_medication.ai.dto;

public record AiOcrRequest(
        Long ocrResultId,
        Long userId,
        String imageKey
) {
}
