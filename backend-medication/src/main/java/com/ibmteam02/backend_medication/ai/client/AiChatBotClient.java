package com.ibmteam02.backend_medication.ai.client;

import com.ibmteam02.backend_medication.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiChatBotClient {

    private final RestClient aiRestClient;

    public AiChatBotResponse sendChat(AiChatBotRequest request) {
        return aiRestClient.post()
                .uri("/api/ai/chat")
                .body(request)
                .retrieve()
                .body(AiChatBotResponse.class);
    }
}
