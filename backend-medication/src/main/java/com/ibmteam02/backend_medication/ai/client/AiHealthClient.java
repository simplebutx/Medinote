package com.ibmteam02.backend_medication.ai.client;

import com.ibmteam02.backend_medication.ai.dto.AiHealthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AiHealthClient {

    private final RestClient aiRestClient;

    public AiHealthResponse checkHealth() {
        return aiRestClient.get()
                .uri("/health")
                .retrieve()  // 요청 보내고 응답을 받아올 준비
                .body(AiHealthResponse.class);  // 응답 body를 AiHealthResponse 객체로 변환
    }
}

// .class = 이 클래스로 변환해줘 / 이 클래스 타입 정보를 넘겨줘