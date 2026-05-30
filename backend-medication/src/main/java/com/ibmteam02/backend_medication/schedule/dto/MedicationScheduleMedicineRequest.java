package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.DosageUnit;
import java.math.BigDecimal;

public record MedicationScheduleMedicineRequest(
        Long id,
        Long medicineId,
        String customMedicineName,
        BigDecimal dosageAmount,
        DosageUnit dosageUnit,
        Integer timesPerDay,
        Integer durationDays
) {
}
