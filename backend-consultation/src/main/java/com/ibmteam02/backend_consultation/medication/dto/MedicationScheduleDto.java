package com.ibmteam02.backend_consultation.medication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationScheduleDto {
    private Long id;
    private String customMedicineName;
    private String hospitalName;
    private String pharmacyName;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<MedicationScheduleMedicineDto> medicines;
}
