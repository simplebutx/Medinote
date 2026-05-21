package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.MedicationTiming;
import java.time.LocalTime;

public record MedicationScheduleTimeRequest(
        Long medicationScheduleId,
        MedicationTiming timing,
        LocalTime takeTime,
        Integer sortOrder
) {
}
