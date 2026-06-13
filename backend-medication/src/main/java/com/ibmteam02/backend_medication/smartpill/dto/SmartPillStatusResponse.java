package com.ibmteam02.backend_medication.smartpill.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SmartPillStatusResponse(
        String message,
        String deviceId,
        String eventType,
        Integer muxPort,
        Integer distanceMm,
        Boolean pillPresent,
        Long buttonClickCount,
        List<SmartPillSlotState> slots,
        Long uptimeMs,
        Long sequence,
        LocalDateTime receivedAt
) {
}
