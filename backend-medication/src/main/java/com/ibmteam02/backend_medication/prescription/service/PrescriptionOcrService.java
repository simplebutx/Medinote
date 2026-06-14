package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.ai.client.AiOcrClient;
import com.ibmteam02.backend_medication.ai.dto.AiOcrRequest;
import com.ibmteam02.backend_medication.ai.dto.AiOcrResponse;
import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.prescription.cache.OcrResultCache;
import com.ibmteam02.backend_medication.prescription.cache.OcrResultCacheRepository;
import com.ibmteam02.backend_medication.prescription.config.S3StorageProperties;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionOcrResponse;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import software.amazon.awssdk.services.s3.S3Client;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
public class PrescriptionOcrService {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    private final OcrResultCacheRepository ocrResultCacheRepository;
    private final AiOcrClient aiOcrClient;
    private final MedicineNameMatchService medicineMatchService;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;
    private final S3StorageProperties s3StorageProperties;

    // ocr 실행
    public PrescriptionOcrResponse runOcr(Long userId, Long ocrResultId) {
        if (userId == null) {
            throw new ForbiddenException("Authenticated user is required.");
        }

        // Redis 조회
        OcrResultCache ocrResult = ocrResultCacheRepository.findById(ocrResultId);
        if (ocrResult == null) {
            throw new ResourceNotFoundException("OCR result not found.");
        }
        if (!userId.equals(ocrResult.userId())) {
            throw new ForbiddenException("OCR result is not owned by the authenticated user.");
        }

        // 상태값 변경 + 재저장
        ocrResult = ocrResult.processing(now());
        ocrResultCacheRepository.save(ocrResult);

        try {
            // ai server에 요청
            AiOcrResponse aiResponse = aiOcrClient.analyzePrescription(
                    new AiOcrRequest(ocrResult.ocrResultId(), userId, ocrResult.imageKey())
            );

            // 서버가 준 ocr 결과에 matchedName 추가
            String updatedResultJson = addMatchedName(aiResponse.resultJson());
            // 상태값 변경 + 재저장
            ocrResult = ocrResult.success(updatedResultJson, now());
            ocrResultCacheRepository.save(ocrResult);

            // s3에 업로드했던 처방전 이미지 삭제
            String imageKey = ocrResult.imageKey();
            if (imageKey != null && !imageKey.isBlank()) {
                s3Client.deleteObject(builder -> builder
                        .bucket(s3StorageProperties.bucket())
                        .key(imageKey));
            }

            return toResponse(ocrResult);
        } catch (RestClientException exception) {
            ocrResult = ocrResult.failed(exception.getMessage(), now());
            ocrResultCacheRepository.save(ocrResult);
            return toResponse(ocrResult);
        } catch (RuntimeException exception) {
            ocrResult = ocrResult.failed(exception.getMessage(), now());
            ocrResultCacheRepository.save(ocrResult);
            throw exception;
        }
    }

    // ocr 결과에서 약이름 추출 (db와 매칭)
    private String addMatchedName(String resultJson) {
        try {
            ObjectNode root = (ObjectNode) objectMapper.readTree(resultJson);

            JsonNode medicinesNode = root.path("medicines");
            if (!medicinesNode.isArray() || medicinesNode.isEmpty()) {
                return resultJson;
            }

            for (JsonNode medicineNode : medicinesNode) {
                if (!(medicineNode instanceof ObjectNode medicineObject)) {
                    continue;
                }

                String originalName = medicineObject.path("name").asText(null);
                MedicineNameMatchService.MatchResult matchResult = medicineMatchService.matchNameWithCandidates(originalName);
                String matchedName = matchResult.matchedName();

                medicineObject.put("originalName", originalName);
                medicineObject.put("matchedName", matchedName != null ? matchedName : originalName);
                medicineObject.put("matchScore", matchResult.score());
                medicineObject.put("matchStatus", matchResult.status());
                ArrayNode candidates = medicineObject.putArray("matchCandidates");
                for (MedicineNameMatchService.MatchCandidate candidate : matchResult.candidates()) {
                    ObjectNode candidateNode = candidates.addObject();
                    candidateNode.put("name", candidate.name());
                    candidateNode.put("score", candidate.score());
                    candidateNode.put("reason", candidate.reason());
                }
            }

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to add matchedName to OCR result.", e);
        }
    }

    private PrescriptionOcrResponse toResponse(OcrResultCache ocrResult) {
        return new PrescriptionOcrResponse(
                ocrResult.ocrResultId(),
                ocrResult.resultJson(),
                ocrResult.status(),
                ocrResult.errorMessage()
        );
    }

    private LocalDateTime now() {
        return LocalDateTime.now(SCHEDULE_ZONE);
    }
}
