package com.ibmteam02.backend_medication.pharmacy.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PharmacyInventoryRequest {
    private String pharmacyHpid;
    private String itemSeq; // 약 고유번호
    private String itemName; //약 이름
    private String companyName; // 제조사명
    private Integer stockQuantity; //재고 수량
}
