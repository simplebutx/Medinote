package com.ibmteam02.backend_consultation.ai.dto;

import java.util.List;

public record AiChatBotRequest(
        String message,
        String normalizedMessage,
        List<String> extractedNames,
        Long userId,
        String questionType,
        String scheduleContext
) {
}

