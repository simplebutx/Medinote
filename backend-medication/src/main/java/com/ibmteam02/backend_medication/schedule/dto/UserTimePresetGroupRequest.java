package com.ibmteam02.backend_medication.schedule.dto;

import java.util.List;

public record UserTimePresetGroupRequest(
        Integer timesPerDay,
        List<UserTimePresetSlotRequest> slots
) {
}
