package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class Medicine {

    @Id
    private Long itemSeq;

    private String itemName;

    public Medicine(Long itemSeq, String itemName) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
    }
}
