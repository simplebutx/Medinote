package com.ibmteam02.backend_medication.smartpill.dto;

import java.util.List;

public record SmartPillIntakeTestRequest(
        String deviceId,
        String eventType,
        Integer muxPort,
        Integer distanceMm,
        Boolean pillPresent,
        Long buttonClickCount,
        List<SmartPillSlotState> slots,
        Long uptimeMs,
        Long sequence
) {
}
