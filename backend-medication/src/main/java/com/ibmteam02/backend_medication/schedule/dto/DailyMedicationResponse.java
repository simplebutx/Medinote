package com.ibmteam02.backend_medication.schedule.dto;

import java.time.LocalDate;
import java.util.List;

public record DailyMedicationResponse(
        LocalDate date,
        List<DailyMedicationTimeGroupResponse> groups
) {
}
