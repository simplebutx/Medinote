package com.ibmteam02.backend_medication.ai.client;

import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisRequest;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiPrescriptionAnalysisClient {

    private final RestClient aiRestClient;

    public AiPrescriptionAnalysisResponse analyze(AiPrescriptionAnalysisRequest request) {
        return aiRestClient.post()
                .uri("api/ai/prescription-analysis")
                .body(request)
                .retrieve()
                .body(AiPrescriptionAnalysisResponse.class);
    }
}
