package com.ibmteam02.backend_auth.global.config;

import com.ibmteam02.backend_auth.global.auth.handler.OAuth2FailureHandler;
import com.ibmteam02.backend_auth.global.auth.handler.OAuth2SuccessHandler;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

@Configuration
public class OAuth2Config {

    @Value("${app.frontend.url:http://localhost:5174}")
    private String defaultFrontendUrl;

    @Bean
    public AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository() {
        return new HttpSessionOAuth2AuthorizationRequestRepository();
    }

    @Bean
    public OAuth2SuccessHandler oAuth2SuccessHandler(JwtProvider jwtProvider, AuthorizationRequestRepository<OAuth2AuthorizationRequest> repository) {
        return new OAuth2SuccessHandler(jwtProvider, repository, defaultFrontendUrl);
    }

    @Bean
    public OAuth2FailureHandler oAuth2FailureHandler() {
        return new OAuth2FailureHandler(defaultFrontendUrl);
    }
}
