package com.ibmteam02.backend_medication.ai.dto;

import java.util.List;

public record AiMedicineCautionTagItem(
        String medicineName,
        List<AiMedicineCautionTag> tags
) {
}
