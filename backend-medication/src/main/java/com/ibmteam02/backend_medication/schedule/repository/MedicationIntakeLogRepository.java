package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationIntakeLogRepository extends JpaRepository<MedicationIntakeLog, Long> {
    List<MedicationIntakeLog> findByMedicationScheduleIdOrderByScheduledAtDesc(Long medicationScheduleId);
}
