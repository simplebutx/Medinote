package com.ibmteam02.backend_consultation.consultation.dto;

import com.ibmteam02.backend_consultation.medication.dto.MedicationScheduleDto;
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
public class PatientInfoResponse {
    private String username;
    private LocalDate birthDate;
    private String gender;
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private Boolean isChild;
    private Boolean isElderly;
    private List<String> chronicDiseases;
    private List<MedicationScheduleDto> medicationSchedules;
}
