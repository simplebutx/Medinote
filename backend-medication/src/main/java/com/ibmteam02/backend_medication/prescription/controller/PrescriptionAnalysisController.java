package com.ibmteam02.backend_medication.prescription.controller;

import com.ibmteam02.backend_medication.prescription.dto.PrescriptionAnalysisResponse;
import com.ibmteam02.backend_medication.prescription.service.PrescriptionAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionAnalysisController {

    private final PrescriptionAnalysisService prescriptionAnalysisService;

    // 처방전 분석
    @PostMapping("/{scheduleId}/analysis")
    public PrescriptionAnalysisResponse analyzePrescription(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long scheduleId
    ) {
        return prescriptionAnalysisService.analyzePrescription(userId, scheduleId);
    }
}
