package com.ibmteam02.backend_medication.medicine.dto;

import java.util.List;

public record ChatbotMedicineContextRequest(
        Long userId,
        List<String> extractedNames,
        List<String> requestDetails
) {
}
