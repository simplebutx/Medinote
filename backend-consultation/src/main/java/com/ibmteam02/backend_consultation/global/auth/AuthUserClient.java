package com.ibmteam02.backend_consultation.global.auth;

import com.ibmteam02.backend_consultation.consultation.dto.PatientInfoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthUserClient {
    private final RestClient authRestClient;

    public String getCustomerName(Long userId) {
        try {
            Map response = authRestClient.post()
                    .uri("/api/internal/users/health-context")
                    .body(Map.of("userId", userId))
                    .retrieve()
                    .body(Map.class);

            return (String) response.get("username");
        } catch (Exception e) {
            return "알 수 없는 사용자"; // 에러 시 기본값
        }
    }

    public PatientInfoResponse getPatientInfo(Long userId) {
        try {
            Map<String, Object> response = authRestClient.post()
                    .uri("/api/internal/users/health-context")
                    .body(Map.of("userId", userId))
                    .retrieve()
                    .body(Map.class);

            if (response == null) return null;

            String birthDateStr = (String) response.get("birthDate");
            LocalDate birthDate = birthDateStr != null ? LocalDate.parse(birthDateStr) : null;

            return PatientInfoResponse.builder()
                    .username((String) response.get("username"))
                    .birthDate(birthDate)
                    .gender((String) response.get("gender"))
                    .isPregnant((Boolean) response.get("isPregnant"))
                    .isBreastfeeding((Boolean) response.get("isBreastfeeding"))
                    .isSmoking((Boolean) response.get("isSmoking"))
                    .isDrinking((Boolean) response.get("isDrinking"))
                    .isChild((Boolean) response.get("isChild"))
                    .isElderly((Boolean) response.get("isElderly"))
                    .chronicDiseases((List<String>) response.get("chronicDiseases"))
                    .build();
        } catch (Exception e) {
            return null;
        }
    }
}
