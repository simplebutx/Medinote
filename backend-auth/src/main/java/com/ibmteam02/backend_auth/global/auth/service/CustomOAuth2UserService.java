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
    private final com.ibmteam02.backend_auth.global.util.EncryptionUtils encryptionUtils;

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
        String emailHash = encryptionUtils.hash(attributes.getEmail());
        
        // 1. 먼저 해시로 검색
        User user = userRepository.findByEmailHash(emailHash)
                .orElseGet(() -> {
                    // 2. 없으면 평문 이메일로 검색 (기존 소셜 가입자 마이그레이션)
                    return userRepository.findByRawEmail(attributes.getEmail())
                            .map(legacyUser -> {
                                legacyUser.updateEmailHash(emailHash);
                                return legacyUser;
                            })
                            .orElseGet(() -> attributes.toEntity(emailHash)); // 3. 아예 없으면 신규 생성
                });

        return userRepository.save(user);

    }
}
