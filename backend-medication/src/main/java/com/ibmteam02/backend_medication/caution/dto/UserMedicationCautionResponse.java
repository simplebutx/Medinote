package com.ibmteam02.backend_medication.caution.dto;

import com.ibmteam02.backend_medication.caution.domain.Reason;
import java.time.LocalDateTime;

public record UserMedicationCautionResponse(
        Long id,
        Long userId,
        Long itemSeq,
        String itemName,
        String ingredientCode,
        String ingredientName,
        Reason reason,
        String memo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
