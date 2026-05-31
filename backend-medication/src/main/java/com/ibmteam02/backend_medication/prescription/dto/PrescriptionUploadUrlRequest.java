package com.ibmteam02.backend_medication.prescription.dto;

import jakarta.validation.constraints.NotBlank;

public record PrescriptionUploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String contentType
) {
}
