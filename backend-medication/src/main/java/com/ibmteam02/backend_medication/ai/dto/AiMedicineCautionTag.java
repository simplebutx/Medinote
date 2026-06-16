package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiMedicineCautionTag(
        String tagCode,
        String tagName,
        List<String> matchedKeywords
) {
}
