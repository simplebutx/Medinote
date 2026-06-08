package com.ibmteam02.backend_medication.pharmacy.domain;

import com.ibmteam02.backend_medication.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pharmacist_inventory")
public class PharmacyInventory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long pharmacistId; //약사 ID

    @Column(nullable = false)
    private String pharmacyHpid; // 약국 고유 코드

    @Column(nullable = false)
    private String itemSeq; //공공데이터 번호(없을 수도 있음)

    @Column(nullable = false)
    private String itemName; //약 이름

    private String companyName; //제조사 이름

    @Column(nullable = false)
    private Integer stockQuantity; //재고 수량

    @Builder
    public PharmacyInventory(Long pharmacistId, String pharmacyHpid, String itemSeq,
                             String itemName, String companyName, Integer stockQuantity){
        this.pharmacistId = pharmacistId;
        this.pharmacyHpid = pharmacyHpid;
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.companyName = companyName;
        this.stockQuantity = stockQuantity;
    }

    public void updateStock(Integer quantity){
        this.stockQuantity = quantity;
    }
}
