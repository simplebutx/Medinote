package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiPrescriptionAnalysisItem(
        Long scheduleMedicineId,
        String medicineName,
        List<String> matchedHealthInfoNames,
        List<String> matchedDiseaseNames
) {
}
