package com.ibmteam02.backend_medication.ai.client;

import com.ibmteam02.backend_medication.ai.dto.AiOcrRequest;
import com.ibmteam02.backend_medication.ai.dto.AiOcrResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiOcrClient {

    private final RestClient aiRestClient;

    public AiOcrResponse analyzePrescription(AiOcrRequest request) {
        return aiRestClient.post()
                .uri("api/ai/ocr/prescriptions")
                .body(request)
                .retrieve()
                .body(AiOcrResponse.class);
    }
}
