package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.Column;
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

    @Column(columnDefinition = "TEXT")
    private String productName;

    private String ingredientSeq;
    private String ingredientCode;

    @Column(columnDefinition = "TEXT")
    private String ingredientName;

    private String quantity;
    private String unit;

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
