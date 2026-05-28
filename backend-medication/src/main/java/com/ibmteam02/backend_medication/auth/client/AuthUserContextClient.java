package com.ibmteam02.backend_medication.auth.client;

import com.ibmteam02.backend_medication.auth.dto.AuthUserHealthContextRequest;
import com.ibmteam02.backend_medication.auth.dto.AuthUserHealthContextResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class AuthUserContextClient {

    private final RestClient authRestClient;

    public AuthUserHealthContextResponse getHealthContext(AuthUserHealthContextRequest request) {
        return authRestClient.post()
                .uri("/api/internal/users/health-context")
                .body(request)
                .retrieve()
                .body(AuthUserHealthContextResponse.class);
    }
}
