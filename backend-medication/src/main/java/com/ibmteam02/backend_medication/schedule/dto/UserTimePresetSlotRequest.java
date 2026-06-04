package com.ibmteam02.backend_medication.schedule.dto;

import java.time.LocalTime;

public record UserTimePresetSlotRequest(
        Integer sortOrder,
        LocalTime takeTime
) {
}
