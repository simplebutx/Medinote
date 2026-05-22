package com.ibmteam02.backend_medication.caution.repository;

import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMedicationCautionRepository extends JpaRepository<UserMedicationCaution, Long> {

    List<UserMedicationCaution> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
