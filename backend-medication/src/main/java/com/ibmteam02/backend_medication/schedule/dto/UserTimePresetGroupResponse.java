package com.ibmteam02.backend_medication.schedule.dto;

import java.util.List;

public record UserTimePresetGroupResponse(
        Integer timesPerDay,
        List<UserTimePresetSlotResponse> slots
) {
}
