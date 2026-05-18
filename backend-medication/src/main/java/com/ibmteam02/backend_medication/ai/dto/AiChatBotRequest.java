package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiChatBotRequest(
        String message,
        String normalizedMessage,
        List<String> extractedNames,
        List<String> requestSlots,
        List<String> requestDetails,
        String medicineContext
) {
}
