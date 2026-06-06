package com.ibmteam02.backend_consultation.ai.client;

import com.ibmteam02.backend_consultation.ai.dto.AiConsultationSummaryRequest;
import com.ibmteam02.backend_consultation.ai.dto.AiConsultationSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiConsultationSummaryClient {

    private final RestClient aiRestClient;

    public AiConsultationSummaryResponse requestSummary(AiConsultationSummaryRequest request) {
        return aiRestClient.post()
                .uri("/api/ai/consultation/summary")
                .body(request)
                .retrieve()
                .body(AiConsultationSummaryResponse.class);
    }
}
