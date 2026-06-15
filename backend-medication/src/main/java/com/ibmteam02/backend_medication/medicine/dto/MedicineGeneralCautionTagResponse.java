package com.ibmteam02.backend_medication.medicine.dto;

import java.util.List;

public record MedicineGeneralCautionTagResponse(
        String tagCode,
        String tagName,
        List<String> matchedKeywords
) {
}
