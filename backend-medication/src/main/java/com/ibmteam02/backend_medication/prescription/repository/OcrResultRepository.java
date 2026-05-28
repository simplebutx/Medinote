package com.ibmteam02.backend_medication.prescription.repository;

import com.ibmteam02.backend_medication.prescription.domain.OcrResult;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OcrResultRepository extends JpaRepository<OcrResult, Long> {
    Optional<OcrResult> findByIdAndUserId(Long id, Long userId);
}
