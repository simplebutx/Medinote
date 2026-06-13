package com.ibmteam02.backend_medication.smartpill.dto;

import java.time.LocalTime;

public record SmartPillSlotScheduleTimeResponse(
        Long medicationScheduleTimeId,
        Long medicationScheduleMedicineId,
        String medicineName,
        LocalTime takeTime
) {
}
