package com.ibmteam02.backend_medication.pharmacy.service;

import com.ibmteam02.backend_medication.pharmacy.domain.PharmacyInventory;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyInventoryRequest;
import com.ibmteam02.backend_medication.pharmacy.repository.PharmacyInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PharmacyInventoryService {

    private final PharmacyInventoryRepository pharmacyInventoryRepository;

    //약사 약국 재고 저장 , 수정
    @Transactional
    public void savePharmacyInventory(Long pharmacistId, PharmacyInventoryRequest pharmacyInventoryRequest){
        //itemSeq
        String finalItemSeq = pharmacyInventoryRequest.getItemSeq();

        //itemSeq 없으면 CUSTOM_12345 로 생성
        if(finalItemSeq == null || finalItemSeq.isBlank()){
            finalItemSeq = "CUSTOM_" + System.currentTimeMillis();
        }

        Optional<PharmacyInventory> existing = pharmacyInventoryRepository
                .findByPharmacistIdAndItemSeq(pharmacistId,finalItemSeq);

        if(existing.isPresent()){
            existing.get().updateStock(pharmacyInventoryRequest.getStockQuantity());
        } else {
            PharmacyInventory inventory = PharmacyInventory.builder()
                    .pharmacistId(pharmacistId)
                    .pharmacyHpid(pharmacyInventoryRequest.getPharmacyHpid())
                    .itemSeq(finalItemSeq)
                    .itemName(pharmacyInventoryRequest.getItemName())
                    .companyName(pharmacyInventoryRequest.getCompanyName())
                    .stockQuantity(pharmacyInventoryRequest.getStockQuantity())
                    .build();
            pharmacyInventoryRepository.save(inventory);
        }
    }

    //약사 약국 재고 조회
    @Transactional(readOnly = true)
    public List<PharmacyInventory> getMyInventory(Long pharmacistId){
        return pharmacyInventoryRepository.findByPharmacistId(pharmacistId);
    }

    //약사 재고 삭제
    @Transactional
    public void deleteInventory(Long pharmacistId, Long inventoryId){
        PharmacyInventory inventory = pharmacyInventoryRepository.findById(inventoryId)
                .orElseThrow(()-> new IllegalArgumentException("재고 정보를 찾을 수 없습니다"));

        if (inventory.getPharmacistId() == null || !inventory.getPharmacistId().equals(pharmacistId)){
            throw new IllegalStateException("삭제 권한이 없습니다");
        }

        pharmacyInventoryRepository.delete(inventory);
    }
}
