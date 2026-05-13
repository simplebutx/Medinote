package com.ibmteam02.backend_medication.ai.controller;

import com.ibmteam02.backend_medication.ai.client.AiHealthClient;
import com.ibmteam02.backend_medication.ai.dto.AiHealthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AiHealthController {
    private final AiHealthClient aiHealthClient;

    @GetMapping("/api/ai/health")
    public AiHealthResponse checkHealth() {
        return aiHealthClient.checkHealth();
    }
}
