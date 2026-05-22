package com.ibmteam02.backend_medication.medicine.dto;

public record MedicineSearchResponse(
        Long itemSeq,
        String itemName,
        String companyName,
        String efficacy,
        String useMethod,
        String caution,
        String sideEffect,
        String imageUrl
) {
}
