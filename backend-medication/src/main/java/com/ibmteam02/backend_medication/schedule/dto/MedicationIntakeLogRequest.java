package com.ibmteam02.backend_medication.schedule.dto;

import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeStatus;
import java.time.LocalDateTime;

public record MedicationIntakeLogRequest(
        Long medicationScheduleId,
        Long medicationScheduleTimeId,
        MedicationIntakeStatus status,
        LocalDateTime scheduledAt,
        LocalDateTime takenAt
) {
}
