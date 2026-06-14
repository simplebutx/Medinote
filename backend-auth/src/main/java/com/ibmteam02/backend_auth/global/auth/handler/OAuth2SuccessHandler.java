package com.ibmteam02.backend_auth.global.auth.handler;

import com.ibmteam02.backend_auth.global.auth.domain.CustomUserDetails;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtProvider jwtProvider;
    private final AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository;
    private final String defaultFrontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        
        // 1. 세션에 저장된 인증 요청 정보에서 프론트엔드 주소를 꺼냄
        OAuth2AuthorizationRequest authRequest = authorizationRequestRepository.loadAuthorizationRequest(request);
        
        String targetBaseUrl = defaultFrontendUrl;
        if (authRequest != null && authRequest.getAdditionalParameters().containsKey("custom_redirect_uri")) {
            targetBaseUrl = (String) authRequest.getAdditionalParameters().get("custom_redirect_uri");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String accessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());

        String targetUrl;
        if (user.getStatus() == UserStatus.PENDING) {
            targetUrl = UriComponentsBuilder.fromUriString(targetBaseUrl + "/signup/extra-info")
                    .queryParam("token", accessToken)
                    .queryParam("email", user.getEmail())
                    .build().toUriString();
        } else {
            targetUrl = UriComponentsBuilder.fromUriString(targetBaseUrl + "/oauth2/redirect")
                    .queryParam("token", accessToken)
                    .build().toUriString();
        }

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
