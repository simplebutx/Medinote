package com.ibmteam02.backend_medication.smartpill.dto;

import java.util.List;

public record SmartPillSlotSaveRequest(
        Integer slotNumber,
        List<Long> medicationScheduleTimeIds
) {
}
