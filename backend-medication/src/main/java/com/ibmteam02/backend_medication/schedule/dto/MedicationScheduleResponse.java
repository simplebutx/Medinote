package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.DosageUnit;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MedicationScheduleResponse(
        Long id,
        Long userId,
        Long medicineId,
        String customMedicineName,
        String hospitalName,
        String pharmacyName,
        BigDecimal dosageAmount,
        DosageUnit dosageUnit,
        Integer timesPerDay,
        Integer durationDays,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate dispensedDate,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<MedicationScheduleMedicineResponse> medicines
) {
}
