package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.DosageUnit;
import com.ibmteam02.backend_medication.schedule.domain.FrequencyType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MedicationScheduleRequest(
        Long userId,
        Long medicineId,
        String customMedicineName,
        String hospitalName,
        String pharmacyName,
        BigDecimal dosageAmount,
        DosageUnit dosageUnit,
        FrequencyType frequencyType,
        Integer timesPerDay,
        Integer intervalHours,
        Integer durationDays,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate prescribedDate,
        LocalDate dispensedDate,
        Boolean isActive,
        List<MedicationScheduleMedicineRequest> medicines
) {
}
