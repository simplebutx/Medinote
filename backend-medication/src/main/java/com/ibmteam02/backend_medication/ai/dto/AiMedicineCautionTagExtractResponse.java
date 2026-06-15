package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiMedicineCautionTagExtractResponse(
        List<AiMedicineCautionTagItem> items
) {
}
