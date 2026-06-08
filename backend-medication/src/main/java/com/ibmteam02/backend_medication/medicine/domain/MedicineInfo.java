package com.ibmteam02.backend_medication.medicine.domain;

import com.ibmteam02.backend_medication.global.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class MedicineInfo extends BaseTimeEntity {

    @Id
    private Long itemSeq;

    @Column(columnDefinition = "TEXT")
    private String itemName;

    @Column(length = 500)
    private String companyName;

    @Column(columnDefinition = "TEXT")
    private String efficacy;

    @Column(columnDefinition = "TEXT")
    private String useMethod;

    @Column(columnDefinition = "TEXT")
    private String warningBeforeUse;

    @Column(columnDefinition = "TEXT")
    private String caution;

    @Column(columnDefinition = "TEXT")
    private String interaction;

    @Column(columnDefinition = "TEXT")
    private String sideEffect;

    @Column(columnDefinition = "TEXT")
    private String storageMethod;

    @Column(name = "update_de")
    private String updateDe;

    private String imageUrl;

    @Column(name = "efficacy_document_id")
    private String efficacyDocumentId;

    @Column(name = "usage_document_id")
    private String usageDocumentId;

    @Column(name = "precaution_document_id")
    private String precautionDocumentId;

    public MedicineInfo(
            Long itemSeq,
            String itemName,
            String companyName,
            String efficacy,
            String useMethod,
            String warningBeforeUse,
            String caution,
            String interaction,
            String sideEffect,
            String storageMethod,
            String updateDe,
            String imageUrl,
            String efficacyDocumentId,
            String usageDocumentId,
            String precautionDocumentId
    ) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.companyName = companyName;
        this.efficacy = efficacy;
        this.useMethod = useMethod;
        this.warningBeforeUse = warningBeforeUse;
        this.caution = caution;
        this.interaction = interaction;
        this.sideEffect = sideEffect;
        this.storageMethod = storageMethod;
        this.updateDe = updateDe;
        this.imageUrl = imageUrl;
        this.efficacyDocumentId = efficacyDocumentId;
        this.usageDocumentId = usageDocumentId;
        this.precautionDocumentId = precautionDocumentId;
    }

    public void updateFromCsv(
            String itemName,
            String companyName,
            String storageMethod,
            String efficacyDocumentId,
            String usageDocumentId,
            String precautionDocumentId
    ) {
        this.itemName = itemName;
        this.companyName = companyName;
        this.storageMethod = storageMethod;
        this.efficacyDocumentId = efficacyDocumentId;
        this.usageDocumentId = usageDocumentId;
        this.precautionDocumentId = precautionDocumentId;
    }
}
