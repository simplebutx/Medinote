package com.ibmteam02.backend_medication.prescription.controller;

import com.ibmteam02.backend_medication.prescription.dto.PrescriptionUploadUrlRequest;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionUploadUrlResponse;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionOcrResponse;
import com.ibmteam02.backend_medication.prescription.service.PrescriptionOcrService;
import com.ibmteam02.backend_medication.prescription.service.PrescriptionUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionUploadController {

    private final PrescriptionUploadService prescriptionUploadService;
    private final PrescriptionOcrService prescriptionOcrService;

    // presigned URL, key 요청
    @PostMapping("/upload-url")
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionUploadUrlResponse createUploadUrl(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PrescriptionUploadUrlRequest request
    ) {
        return prescriptionUploadService.createUploadUrl(userId, request);
    }

    @PostMapping("/{ocrResultId}/ocr")
    public PrescriptionOcrResponse runOcr(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long ocrResultId
    ) {
        return prescriptionOcrService.runOcr(userId, ocrResultId);
    }
}
