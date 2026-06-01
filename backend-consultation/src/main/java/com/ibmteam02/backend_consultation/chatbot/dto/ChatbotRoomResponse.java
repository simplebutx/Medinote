package com.ibmteam02.backend_consultation.chatbot.dto;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record ChatbotRoomResponse(
        Long roomId,
        Long userId,
        String title,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
