package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiPrescriptionAnalysisKeywordGroup(
        String label,
        List<String> keywords
) {
}
