package com.ibmteam02.backend_consultation.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AiClientConfig {

    // FastAPI 서버 주소를 가진 RestClient를 Bean으로 등록
    // 여러 곳에서 같은 FastAPI 주소로 호출할 거면 restClient를 Bean으로 등록해두는 게 깔끔함
    @Bean
    public RestClient aiRestClient(@Value("${ai.service.base-url}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}
