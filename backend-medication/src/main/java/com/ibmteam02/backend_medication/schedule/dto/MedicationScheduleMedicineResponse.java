package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.DosageUnit;
import com.ibmteam02.backend_medication.schedule.domain.FrequencyType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MedicationScheduleMedicineResponse(
        Long id,
        Long medicationScheduleId,
        Long medicineId,
        String customMedicineName,
        BigDecimal dosageAmount,
        DosageUnit dosageUnit,
        FrequencyType frequencyType,
        Integer timesPerDay,
        Integer intervalHours,
        Integer durationDays,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
