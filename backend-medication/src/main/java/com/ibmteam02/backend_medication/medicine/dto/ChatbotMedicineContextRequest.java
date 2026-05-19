package com.ibmteam02.backend_medication.medicine.dto;

import java.util.List;

public record ChatbotMedicineContextRequest(
        List<String> extractedNames,
        List<String> requestDetails
) {
}
