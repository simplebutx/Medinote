package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicationScheduleRepository extends JpaRepository<MedicationSchedule, Long> {
    List<MedicationSchedule> findByUserId(Long userId);
    
    Page<MedicationSchedule> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    java.util.Optional<MedicationSchedule> findByIdAndUserId(Long id, Long userId);
}
