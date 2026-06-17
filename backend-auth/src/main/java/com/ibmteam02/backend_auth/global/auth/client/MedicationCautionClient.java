package com.ibmteam02.backend_auth.global.auth.client;

import com.ibmteam02.backend_auth.user.dto.UserCautionRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class MedicationCautionClient {

    private final RestClient medicationRestClient;

    public void saveUserCautions(Long userId, List<UserCautionRequest> cautions) {
        if (userId == null || cautions == null || cautions.isEmpty()) {
            return;
        }

        medicationRestClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/internal/user-medication-cautions")
                        .queryParam("userId", userId)
                        .build())
                .body(cautions)
                .retrieve()
                .toBodilessEntity();
    }
}
