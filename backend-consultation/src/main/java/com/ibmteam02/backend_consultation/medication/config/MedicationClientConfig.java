package com.ibmteam02.backend_consultation.medication.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class MedicationClientConfig {

    // medication 서버 주소를 가진 RestClient를 Bean으로 등록
    // consultation 서버가 약 정보 컨텍스트를 가져올 때 이 Bean을 공통으로 사용함
    @Bean
    public RestClient medicationRestClient(@Value("${medication.service.base-url}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}
