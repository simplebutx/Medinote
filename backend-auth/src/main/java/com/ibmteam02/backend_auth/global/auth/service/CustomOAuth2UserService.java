package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.domain.CustomUserDetails;
import com.ibmteam02.backend_auth.global.auth.dto.OAuthAttributes;
import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            System.out.println("OAuth2 User Attributes: " + oAuth2User.getAttributes());

            String registrationId = userRequest.getClientRegistration().getRegistrationId();

            String userNameAttributeName = userRequest.getClientRegistration()
                    .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

            OAuthAttributes attributes = OAuthAttributes.of(registrationId, userNameAttributeName,
                    oAuth2User.getAttributes());

            User user = saveOrUpdate(attributes);

            return new CustomUserDetails(user, oAuth2User.getAttributes());
        } catch (Exception e) {
            System.err.println("OAuth2 Login Error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    private User saveOrUpdate(OAuthAttributes attributes) {
        User user = userRepository.findByEmail(attributes.getEmail())
                .map(entity -> {
                    // 기존 유저가 있다면 소셜 정보 연결
                    return entity;
                })
                .orElseGet(() -> attributes.toEntity()); // 신규 유저 생성

        return userRepository.save(user);

    }
}
