package com.ibmteam02.backend_medication.prescription.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ocr_result")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OcrResult {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "image_key", nullable = false, length = 500)
    private String imageKey;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OcrResultStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "ocr_engine", length = 100)
    private String ocrEngine;  // 디버깅용

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public OcrResult(
            Long userId,
            String imageKey,
            String rawText,
            String resultJson,
            OcrResultStatus status,
            String errorMessage,
            String ocrEngine
    ) {
        this.userId = userId;
        this.imageKey = imageKey;
        this.rawText = rawText;
        this.resultJson = resultJson;
        this.status = status;
        this.errorMessage = errorMessage;
        this.ocrEngine = ocrEngine;
    }

    // 상태 변경용 함수
    public void markProcessing(String ocrEngine) {
        this.status = OcrResultStatus.OCR_PROCESSING;
        this.ocrEngine = ocrEngine;
        this.errorMessage = null;
    }

    // 상태 변경용 함수
    public void markSuccess(String rawText, String resultJson, String ocrEngine) {
        this.status = OcrResultStatus.OCR_DONE;
        this.rawText = rawText;
        this.resultJson = resultJson;
        this.ocrEngine = ocrEngine;
        this.errorMessage = null;
    }

    // 상태 변경용 함수
    public void markFailed(String errorMessage, String ocrEngine) {
        this.status = OcrResultStatus.OCR_FAILED;
        this.errorMessage = errorMessage;
        this.ocrEngine = ocrEngine;
    }

    public void confirm(String resultJson) {
        this.status = OcrResultStatus.CONFIRMED;
        this.resultJson = resultJson;
        this.errorMessage = null;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        this.createdAt = now;
        this.updatedAt = now;

        if (this.status == null) {
            this.status = OcrResultStatus.PRESIGNED_ISSUED;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
