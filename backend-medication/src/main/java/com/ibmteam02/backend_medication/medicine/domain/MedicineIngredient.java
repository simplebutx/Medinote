package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.*;
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
    @Column(columnDefinition = "TEXT")
    private String productName;
    private String ingredientSeq;  // 해당 약에서 성분 순서
    private String ingredientCode;  // 성분 코드

    @Column(columnDefinition = "TEXT")
    private String ingredientName;  // 성분 이름
    private String quantity;  // 함량
    private String unit;  // 함량 단위

    public MedicineIngredient(
            Long itemSeq,
            String productName,
            String ingredientSeq,
            String ingredientCode,
            String ingredientName,
            String quantity,
            String unit
    ) {
        this.itemSeq = itemSeq;
        this.productName = productName;
        this.ingredientSeq = ingredientSeq;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.quantity = quantity;
        this.unit = unit;
    }
}
