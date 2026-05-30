package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.ai.client.AiOcrClient;
import com.ibmteam02.backend_medication.ai.dto.AiOcrRequest;
import com.ibmteam02.backend_medication.ai.dto.AiOcrResponse;
import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.prescription.domain.OcrResult;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionOcrResponse;
import com.ibmteam02.backend_medication.prescription.repository.OcrResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class PrescriptionOcrService {
    private static final String OCR_ENGINE_NAME = "google-vision-document-text-detection";

    private final OcrResultRepository ocrResultRepository;
    private final AiOcrClient aiOcrClient;

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
            AiOcrResponse aiResponse = aiOcrClient.analyzePrescription(   // 8081 -> 8000 -> 8081
                    new AiOcrRequest(ocrResult.getId(), userId, ocrResult.getImageKey())
            );

            // 상태값 바꾸고 결과 ocrResult에 저장
            ocrResult.markSuccess(
                    aiResponse.rawText(),
                    aiResponse.resultJson(),
                    aiResponse.ocrEngine()
            );

            return toResponse(ocrResult, aiResponse.preprocessedImageDataUrl());
        } catch (RestClientException exception) {
            ocrResult.markFailed(exception.getMessage(), OCR_ENGINE_NAME);
            return toResponse(ocrResult, null);
        } catch (RuntimeException exception) {
            ocrResult.markFailed(exception.getMessage(), OCR_ENGINE_NAME);
            throw exception;
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
