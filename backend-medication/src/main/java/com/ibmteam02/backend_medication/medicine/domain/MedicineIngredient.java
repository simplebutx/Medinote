package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class MedicineIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long itemSeq;
    private String productName;
    private String ingredientSeq;  // 해당 약에서 성분 순서
    private String ingredientCode;  // 성분 코드
    private String ingredientName;  // 성분 이름
    private String quantity;  // 함량
    private String unit;  // 함량 단위
    private String totalAmountSeq;  // 총량 순번

    public MedicineIngredient(
            Long itemSeq,
            String productName,
            String ingredientSeq,
            String ingredientCode,
            String ingredientName,
            String quantity,
            String unit,
            String totalAmountSeq
    ) {
        this.itemSeq = itemSeq;
        this.productName = productName;
        this.ingredientSeq = ingredientSeq;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.quantity = quantity;
        this.unit = unit;
        this.totalAmountSeq = totalAmountSeq;
    }
}
