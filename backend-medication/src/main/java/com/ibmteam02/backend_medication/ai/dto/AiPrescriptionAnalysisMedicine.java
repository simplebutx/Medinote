package com.ibmteam02.backend_medication.ai.dto;

public record AiPrescriptionAnalysisMedicine(
        Long scheduleMedicineId,
        Long medicineId,
        String medicineName
) {
}
