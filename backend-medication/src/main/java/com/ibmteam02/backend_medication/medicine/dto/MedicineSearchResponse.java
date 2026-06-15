package com.ibmteam02.backend_medication.medicine.dto;

import java.util.List;

public record MedicineSearchResponse(
        Long itemSeq,
        String itemName,
        String companyName,
        String ingredients,
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
        String precautionDocumentId,
        boolean warningMedicine,
        boolean warningIngredient,
        List<MedicineGeneralCautionTagResponse> generalCautionTags
) {
}
