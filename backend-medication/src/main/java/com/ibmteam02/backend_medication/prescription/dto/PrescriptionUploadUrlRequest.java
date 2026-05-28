package com.ibmteam02.backend_medication.prescription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PrescriptionUploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String contentType,
        @NotNull PrescriptionUploadCategory category
) {
}
