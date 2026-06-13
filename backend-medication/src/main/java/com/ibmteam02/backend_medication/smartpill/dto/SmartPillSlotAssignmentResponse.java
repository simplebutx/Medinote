package com.ibmteam02.backend_medication.smartpill.dto;

import java.util.List;

public record SmartPillSlotAssignmentResponse(
        String deviceId,
        String name,
        Boolean activeDetection,
        java.time.LocalDateTime detectionStartedAt,
        List<SmartPillSlotAssignmentSlotResponse> slots
) {
}
