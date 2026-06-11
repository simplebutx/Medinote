package com.ibmteam02.backend_medication.notification.dto;

import com.ibmteam02.backend_medication.notification.domain.NotificationStatus;
import com.ibmteam02.backend_medication.notification.domain.NotificationType;
import java.time.LocalDateTime;

public record MedicationNotificationResponse(
        Long id,
        Long userId,
        Long medicationScheduleId,
        Long medicationScheduleMedicineId,
        Long medicationScheduleTimeId,
        NotificationType type,
        NotificationStatus status,
        String title,
        String body,
        LocalDateTime scheduledAt,
        LocalDateTime sentAt,
        LocalDateTime readAt,
        String failureReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
