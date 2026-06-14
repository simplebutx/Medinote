package com.ibmteam02.backend_auth.global.auth.resolver;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.HashMap;
import java.util.Map;

public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final OAuth2AuthorizationRequestResolver defaultResolver;

    public CustomAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request);
        return customize(authRequest, request);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request, clientRegistrationId);
        return customize(authRequest, request);
    }

    private OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest authRequest, HttpServletRequest request) {
        if (authRequest == null) return null;

        // 프론트엔드에서 보낸 redirect_uri 파라미터를 가로챔
        String redirectUri = request.getParameter("redirect_uri");
        
        if (redirectUri != null) {
            Map<String, Object> additionalParameters = new HashMap<>(authRequest.getAdditionalParameters());
            additionalParameters.put("custom_redirect_uri", redirectUri);

            return OAuth2AuthorizationRequest.from(authRequest)
                    .additionalParameters(additionalParameters)
                    .build();
        }
        return authRequest;
    }
}
