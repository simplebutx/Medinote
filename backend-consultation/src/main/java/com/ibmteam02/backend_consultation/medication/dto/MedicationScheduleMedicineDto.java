package com.ibmteam02.backend_consultation.medication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationScheduleMedicineDto {
    private String customMedicineName;
    private BigDecimal dosageAmount;
    private String dosageUnit;
}
