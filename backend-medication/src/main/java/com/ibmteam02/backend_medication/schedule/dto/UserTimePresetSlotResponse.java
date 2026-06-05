package com.ibmteam02.backend_medication.schedule.dto;

import java.time.LocalTime;

public record UserTimePresetSlotResponse(
        Integer sortOrder,
        LocalTime takeTime
) {
}
