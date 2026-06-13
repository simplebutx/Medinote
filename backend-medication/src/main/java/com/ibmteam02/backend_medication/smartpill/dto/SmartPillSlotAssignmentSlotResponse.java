package com.ibmteam02.backend_medication.smartpill.dto;

import java.time.LocalTime;
import java.util.List;

public record SmartPillSlotAssignmentSlotResponse(
        Integer slotNumber,
        LocalTime takeTime,
        List<SmartPillSlotScheduleTimeResponse> scheduleTimes
) {
}
