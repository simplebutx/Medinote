package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationScheduleMedicineRepository extends JpaRepository<MedicationScheduleMedicine, Long> {
    List<MedicationScheduleMedicine> findByMedicationScheduleIdOrderByIdAsc(Long medicationScheduleId);

    List<MedicationScheduleMedicine> findByMedicationSchedule_UserIdOrderByIdAsc(Long userId);

    void deleteByMedicationScheduleId(Long medicationScheduleId);
}
