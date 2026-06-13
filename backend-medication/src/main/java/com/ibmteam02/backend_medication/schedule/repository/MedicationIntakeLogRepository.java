package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationIntakeLogRepository extends JpaRepository<MedicationIntakeLog, Long> {
    List<MedicationIntakeLog> findByMedicationScheduleIdOrderByScheduledAtDesc(Long medicationScheduleId);

    List<MedicationIntakeLog> findByMedicationScheduleIdInAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(
            List<Long> medicationScheduleIds,
            LocalDateTime start,
            LocalDateTime end
    );

    boolean existsByMedicationScheduleTime_IdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanAndStatus(
            Long medicationScheduleTimeId,
            LocalDateTime start,
            LocalDateTime end,
            MedicationIntakeStatus status
    );
}
