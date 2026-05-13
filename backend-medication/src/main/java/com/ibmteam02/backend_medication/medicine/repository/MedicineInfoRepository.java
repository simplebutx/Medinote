package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineInfoRepository extends JpaRepository<MedicineInfo, Long> {

    Optional<MedicineInfo> findTopByOrderByUpdateDeDesc();
}
