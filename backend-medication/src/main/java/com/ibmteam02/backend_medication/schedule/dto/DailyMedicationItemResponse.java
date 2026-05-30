package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.DosageUnit;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeStatus;
import com.ibmteam02.backend_medication.schedule.domain.MedicationTiming;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record DailyMedicationItemResponse(
        Long medicationScheduleId,
        Long medicationScheduleMedicineId,
        Long medicationScheduleTimeId,
        Long medicationIntakeLogId,
        Long medicineId,
        String customMedicineName,
        BigDecimal dosageAmount,
        DosageUnit dosageUnit,
        Integer timesPerDay,
        MedicationTiming timing,
        LocalTime takeTime,
        MedicationIntakeStatus intakeStatus,
        LocalDateTime scheduledAt,
        LocalDateTime takenAt,
        String hospitalName,
        String pharmacyName
) {
}
