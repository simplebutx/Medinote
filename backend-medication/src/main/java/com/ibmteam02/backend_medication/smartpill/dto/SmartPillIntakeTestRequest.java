package com.ibmteam02.backend_medication.smartpill.dto;

public record SmartPillIntakeTestRequest(
        String deviceId,
        String eventType,
        Integer muxPort,
        Integer distanceMm,
        Boolean pillPresent,
        Long uptimeMs,
        Long sequence
) {
}
