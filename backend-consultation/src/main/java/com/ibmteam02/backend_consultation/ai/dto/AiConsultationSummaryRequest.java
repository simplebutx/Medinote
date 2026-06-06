package com.ibmteam02.backend_consultation.ai.dto;

public record AiConsultationSummaryRequest(
        Long roomId,
        String chatLog
) {
}
