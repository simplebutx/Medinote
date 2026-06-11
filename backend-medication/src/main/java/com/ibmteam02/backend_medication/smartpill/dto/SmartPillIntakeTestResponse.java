package com.ibmteam02.backend_medication.smartpill.dto;

import java.time.LocalDateTime;

public record SmartPillIntakeTestResponse(
        String message,
        String deviceId,
        String eventType,
        Integer muxPort,
        Integer distanceMm,
        Boolean pillPresent,
        Long uptimeMs,
        Long sequence,
        LocalDateTime receivedAt
) {
}
