package com.ibmteam02.backend_medication.smartpill.dto;

public record SmartPillSlotState(
        Integer slotNumber,
        Integer muxPort,
        Boolean sensorReady,
        Integer distanceMm,
        Boolean pillPresent
) {
}
