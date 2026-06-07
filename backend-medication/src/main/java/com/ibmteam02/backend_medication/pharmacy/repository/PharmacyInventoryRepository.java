package com.ibmteam02.backend_medication.pharmacy.repository;

import com.ibmteam02.backend_medication.pharmacy.domain.PharmacyInventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PharmacyInventoryRepository extends JpaRepository<PharmacyInventory,Long> {
    //약사 본인 창고에서 등록하려는 약이 이미 있는지 찾을 때 사용
    Optional<PharmacyInventory> findByPharmacistIdAndItemSeq(Long pharmacistId, String itemSeq);

    //약사 약국 재고 조회
    List<PharmacyInventory> findByPharmacistId(Long pharmacistId);
}
