package com.ibmteam02.backend_medication.prescription.dto;

import java.util.List;

public record PrescriptionAnalysisResultItem(
        Long scheduleMedicineId,
        Long medicineId,
        String medicineName,
        boolean warningMedicine,
        boolean warningIngredient,
        boolean warningDisease,
        boolean warningHealthInfo,
        List<String> matchedMedicineCautions,
        List<String> matchedIngredientCautions,
        List<String> matchedDiseaseNames,
        List<String> matchedHealthInfoNames,
        List<String> generalCautionTags
) {
}
