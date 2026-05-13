package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class MedicineInfo {

    @Id
    private Long itemSeq;

    private String itemName;

    @Column(columnDefinition = "TEXT")
    private String efficacy;  // 효능

    @Column(columnDefinition = "TEXT")
    private String useMethod;  // 사용법

    @Column(columnDefinition = "TEXT")
    private String warningBeforeUse;  // 사용 전 경고사항

    @Column(columnDefinition = "TEXT")
    private String caution;  // 주의사항

    @Column(columnDefinition = "TEXT")
    private String interaction;  // 같이 주의해야 할 약/음식

    @Column(columnDefinition = "TEXT")
    private String sideEffect;  // 부작용

    @Column(columnDefinition = "TEXT")
    private String storageMethod;  // 보관법

    @Column(name = "update_de")
    private String updateDe;  // 공공데이터 수정일자

    public MedicineInfo(
            Long itemSeq,
            String itemName,
            String efficacy,
            String useMethod,
            String warningBeforeUse,
            String caution,
            String interaction,
            String sideEffect,
            String storageMethod,
            String updateDe
    ) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.efficacy = efficacy;
        this.useMethod = useMethod;
        this.warningBeforeUse = warningBeforeUse;
        this.caution = caution;
        this.interaction = interaction;
        this.sideEffect = sideEffect;
        this.storageMethod = storageMethod;
        this.updateDe = updateDe;
    }
}
