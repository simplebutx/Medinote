package com.ibmteam02.backend_consultation.medication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMedicationCautionDto {
    private Long id;
    private String itemName;
    private String ingredientName;
    private String cautionType;
    private String reason;
    private String memo;
}
