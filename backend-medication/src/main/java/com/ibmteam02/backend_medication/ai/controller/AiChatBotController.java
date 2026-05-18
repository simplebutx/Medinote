package com.ibmteam02.backend_medication.ai.controller;

import com.ibmteam02.backend_medication.ai.client.AiChatBotClient;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AiChatBotController {
    private final AiChatBotClient aiChatBotClient;

    @PostMapping("/api/ai/chat")
    public AiChatBotResponse sendChat(@RequestBody AiChatBotRequest request) {
        return aiChatBotClient.sendChat(request);
    }
}
