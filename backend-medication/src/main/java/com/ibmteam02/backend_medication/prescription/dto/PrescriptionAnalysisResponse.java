package com.ibmteam02.backend_medication.prescription.dto;

import java.util.List;

public record PrescriptionAnalysisResponse(
        Long scheduleId,
        String status,
        String summary,
        List<String> matchedMedicineNames,
        List<String> matchedIngredientNames,
        List<String> matchedDiseaseNames,
        List<String> matchedHealthInfoNames,
        List<PrescriptionAnalysisResultItem> items
) {
}
