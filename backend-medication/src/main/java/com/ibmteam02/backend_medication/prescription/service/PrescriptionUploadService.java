package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.prescription.config.S3StorageProperties;
import com.ibmteam02.backend_medication.prescription.domain.OcrResult;
import com.ibmteam02.backend_medication.prescription.domain.OcrResultStatus;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionUploadUrlRequest;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionUploadUrlResponse;
import com.ibmteam02.backend_medication.prescription.repository.OcrResultRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class PrescriptionUploadService {

    private static final String DEFAULT_REGION = "ap-northeast-2";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/heic",
            "image/heif",
            "application/octet-stream"
    );

    private final S3Presigner s3Presigner;
    private final S3StorageProperties s3StorageProperties;
    private final OcrResultRepository ocrResultRepository;

    @Transactional
    public PrescriptionUploadUrlResponse createUploadUrl(Long userId, PrescriptionUploadUrlRequest request) {
        validateUserId(userId);
        validateConfiguration();
        validateContentType(request.contentType());

        String key = buildObjectKey(userId, request.fileName());
        OcrResult ocrResult = ocrResultRepository.save(
                OcrResult.builder()
                        .userId(userId)
                        .imageKey(key)
                        .status(OcrResultStatus.PRESIGNED_ISSUED)
                        .build()
        );
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(s3StorageProperties.bucket())
                .key(key)
                .contentType(request.contentType())
                .build();
        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofSeconds(s3StorageProperties.presignExpirationSeconds()))
                        .putObjectRequest(putObjectRequest)
                        .build()
        );

        return new PrescriptionUploadUrlResponse(
                ocrResult.getId(),
                presignedRequest.url().toString(),
                key,
                null,
                Map.of()
        );
    }

    private void validateUserId(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Authenticated user is required.");
        }
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(s3StorageProperties.bucket())) {
            throw new IllegalArgumentException("AWS_S3_BUCKET is not configured.");
        }
        if (s3StorageProperties.presignExpirationSeconds() <= 0) {
            throw new IllegalArgumentException("AWS_PRESIGN_EXPIRATION_SECONDS must be greater than 0.");
        }
    }

    private void validateContentType(String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported content type: " + contentType);
        }
    }

    private String buildObjectKey(Long userId, String fileName) {
        LocalDate today = LocalDate.now();
        String sanitizedFileName = sanitizeFileName(fileName);
        String prefix = StringUtils.hasText(s3StorageProperties.keyPrefix())
                ? s3StorageProperties.keyPrefix().replaceAll("/+$", "")
                : "prescriptions";

        return "%s/%d/%04d/%02d/%02d/%s-%s".formatted(
                prefix,
                userId,
                today.getYear(),
                today.getMonthValue(),
                today.getDayOfMonth(),
                UUID.randomUUID(),
                sanitizedFileName
        );
    }

    private String sanitizeFileName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "prescription.jpg";
        }

        String sanitized = fileName.replace("\\", "/");
        sanitized = sanitized.substring(sanitized.lastIndexOf('/') + 1);
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "-");

        if (!StringUtils.hasText(sanitized)) {
            return "prescription.jpg";
        }

        return sanitized;
    }
}
