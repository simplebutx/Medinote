package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MedicineInfoRepository extends JpaRepository<MedicineInfo, Long> {

    Optional<MedicineInfo> findTopByOrderByUpdateDeDesc();
    Optional<MedicineInfo> findByItemName(String itemName);
    List<MedicineInfo> findByItemNameIn(List<String> itemNames);

    @Query("select m.itemName from MedicineInfo m")
    List<String> findAllItemNames();
}
