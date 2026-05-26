package com.ibmteam02.backend_consultation.medication.dto;

import java.util.List;

public record ChatbotMedicineContextRequest(
        Long userId,
        List<String> extractedNames,
        List<String> requestDetails
) {
}
