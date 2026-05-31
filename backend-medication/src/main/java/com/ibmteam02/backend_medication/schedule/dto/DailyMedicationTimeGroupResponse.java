package com.ibmteam02.backend_medication.schedule.dto;

import java.time.LocalTime;
import java.util.List;

public record DailyMedicationTimeGroupResponse(
        LocalTime takeTime,
        List<DailyMedicationItemResponse> medications
) {
}
