package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationScheduleTimeRepository extends JpaRepository<MedicationScheduleTime, Long> {
    List<MedicationScheduleTime> findByMedicationScheduleIdOrderBySortOrderAsc(Long medicationScheduleId);
}
