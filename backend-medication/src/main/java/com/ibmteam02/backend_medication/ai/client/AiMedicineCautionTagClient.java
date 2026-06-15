package com.ibmteam02.backend_medication.ai.client;

import com.ibmteam02.backend_medication.ai.dto.AiMedicineCautionTagExtractResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiMedicineCautionTagClient {

    private final RestClient aiRestClient;

    public AiMedicineCautionTagExtractResponse extractTags() {
        return aiRestClient.get()
                .uri("api/ai/medicine-caution-tags/extract")
                .retrieve()
                .body(AiMedicineCautionTagExtractResponse.class);
    }
}
