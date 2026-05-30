package com.ibmteam02.backend_medication.schedule.dto;

import java.time.LocalDate;
import java.util.List;

public record MedicationScheduleRequest(
        String hospitalName,
        String pharmacyName,
        LocalDate startDate,
        Integer durationDays,
        LocalDate dispensedDate,
        List<MedicationScheduleMedicineRequest> medicines
) {
}
