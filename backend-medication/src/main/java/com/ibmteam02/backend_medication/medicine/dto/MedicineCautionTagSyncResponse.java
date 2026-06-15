package com.ibmteam02.backend_medication.medicine.dto;

public record MedicineCautionTagSyncResponse(
        int extractedMedicineCount,
        int matchedMedicineCount,
        int savedTagCount
) {
}
