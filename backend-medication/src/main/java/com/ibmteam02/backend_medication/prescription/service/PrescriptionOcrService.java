package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.ai.client.AiOcrClient;
import com.ibmteam02.backend_medication.ai.dto.AiOcrRequest;
import com.ibmteam02.backend_medication.ai.dto.AiOcrResponse;
import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.prescription.config.S3StorageProperties;
import com.ibmteam02.backend_medication.prescription.domain.OcrResult;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionOcrResponse;
import com.ibmteam02.backend_medication.prescription.repository.OcrResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import software.amazon.awssdk.services.s3.S3Client;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
public class PrescriptionOcrService {
    private static final String OCR_ENGINE_NAME = "google-vision-document-text-detection";

    private final OcrResultRepository ocrResultRepository;
    private final AiOcrClient aiOcrClient;
    private final MedicineNameMatchService medicineMatchService;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;
    private final S3StorageProperties s3StorageProperties;

    // 업로드한 사진에 대해 ocr 실행
    @Transactional
    public PrescriptionOcrResponse runOcr(Long userId, Long ocrResultId) {
        if (userId == null) {
            throw new ForbiddenException("Authenticated user is required.");
        }

        OcrResult ocrResult = ocrResultRepository.findByIdAndUserId(ocrResultId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("OCR result not found."));

        ocrResult.markProcessing(OCR_ENGINE_NAME);

        try {
            AiOcrResponse aiResponse = aiOcrClient.analyzePrescription(   // 8081 -> 8000 -> 8081 (AI 서버에 요청)
                    new AiOcrRequest(ocrResult.getId(), userId, ocrResult.getImageKey())
            );

            String updatedResultJson = addMatchedName(aiResponse.resultJson());   // 매칭된 ocr 약명들을 비교후, result JSON에 추가 (최종 리턴할 json)

            // 상태값 바꾸고 결과 ocrResult에 저장
            ocrResult.markSuccess(aiResponse.rawText(), updatedResultJson, aiResponse.ocrEngine());

            // ocr 성공 시 s3에 저장된 이미지 삭제 (개인정보)
            if (ocrResult.getImageKey() != null && !ocrResult.getImageKey().isBlank()) {
                s3Client.deleteObject(builder -> builder
                        .bucket(s3StorageProperties.bucket())
                        .key(ocrResult.getImageKey()));
            }


            return toResponse(ocrResult, aiResponse.preprocessedImageDataUrl());
        } catch (RestClientException exception) {
            ocrResult.markFailed(exception.getMessage(), OCR_ENGINE_NAME);
            return toResponse(ocrResult, null);
        } catch (RuntimeException exception) {
            ocrResult.markFailed(exception.getMessage(), OCR_ENGINE_NAME);
            throw exception;
        }
    }

    // ocr 결과에서 약 이름 추출
    private String extractFirstMedicineName(String resultJson) {
        try {
            JsonNode root = objectMapper.readTree(resultJson);
            JsonNode medicines = root.path("medicines");

            if (!medicines.isArray() || medicines.isEmpty()) {
                return null;
            }

            return medicines.get(0).path("name").asText(null);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse OCR resultJson", e);
        }
    }

    // 매칭된 이름들을 최종결과 json에 포함
    private String addMatchedName(String resultJson) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode root = (ObjectNode) objectMapper.readTree(resultJson);

            JsonNode medicinesNode = root.path("medicines");
            if (!medicinesNode.isArray() || medicinesNode.isEmpty()) {
                return resultJson;
            }

            // 약 이름 하나씩 대조함수에 넣기
            for (JsonNode medicineNode : medicinesNode) {
                if (!(medicineNode instanceof ObjectNode medicineObject)) {
                    continue;
                }

                String originalName = medicineObject.path("name").asText(null);
                String matchedName = medicineMatchService.matchName(originalName);

                medicineObject.put("originalName", originalName);
                medicineObject.put("matchedName", matchedName != null ? matchedName : originalName);
            }

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalArgumentException("matchedName 추가 실패", e);
        }
    }

    // preprocessedImageDataUrl 은 디거빙용 (db 저장 x)
    private PrescriptionOcrResponse toResponse(OcrResult ocrResult, String preprocessedImageDataUrl) {
        return new PrescriptionOcrResponse(
                ocrResult.getId(),
                ocrResult.getImageKey(),
                ocrResult.getRawText(),
                ocrResult.getResultJson(),
                ocrResult.getOcrEngine(),
                preprocessedImageDataUrl,
                ocrResult.getStatus(),
                ocrResult.getErrorMessage()
        );
    }
}
