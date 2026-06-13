package com.ibmteam02.backend_medication.smartpill.dto;

import java.time.LocalDateTime;

public record SmartPillDeviceResponse(
        Long id,
        String deviceId,
        String name,
        Boolean activeDetection,
        LocalDateTime detectionStartedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
