package com.ibmteam02.backend_medication.caution.dto;

import com.ibmteam02.backend_medication.caution.domain.CautionType;
import com.ibmteam02.backend_medication.caution.domain.Reason;

public record UserMedicationCautionRequest(
        Long itemSeq,
        String itemName,
        String ingredientCode,
        String ingredientName,
        Reason reason,
        CautionType cautionType,
        String memo
) {
}
