package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiPrescriptionAnalysisRequest(
        Long userId,
        Long scheduleId,
        List<AiPrescriptionAnalysisMedicine> medicines,
        List<AiPrescriptionAnalysisKeywordGroup> healthInfos,
        List<AiPrescriptionAnalysisKeywordGroup> diseases
) {
}
