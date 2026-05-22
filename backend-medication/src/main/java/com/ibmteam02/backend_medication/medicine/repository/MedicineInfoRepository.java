package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MedicineInfoRepository extends JpaRepository<MedicineInfo, Long> {

    Optional<MedicineInfo> findTopByOrderByUpdateDeDesc();
    List<MedicineInfo> findByItemNameIn(List<String> itemNames);
    List<MedicineInfo> findTop10ByItemNameContaining(String keyword); // WHERE item_name LIKE %keyword%
    List<MedicineInfo> findTop20ByItemNameContaining(String keyword);

    @Query("select m.itemName from MedicineInfo m")
    List<String> findAllItemNames();
}
