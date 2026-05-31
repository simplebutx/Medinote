package com.ibmteam02.backend_medication.ai.dto;

public record AiOcrResponse(
        String rawText,
        String resultJson,
        String ocrEngine,
        String preprocessedImageDataUrl
) {
}
