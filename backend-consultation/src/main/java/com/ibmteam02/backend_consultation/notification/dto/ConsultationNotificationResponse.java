package com.ibmteam02.backend_consultation.notification.dto;

import java.time.LocalDateTime;

public record ConsultationNotificationResponse(
        Long id,
        Long receiverId,
        Long senderId,
        Long consultationSessionId,
        Long consultationMessageId,
        String title,
        String body,
        LocalDateTime readAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
