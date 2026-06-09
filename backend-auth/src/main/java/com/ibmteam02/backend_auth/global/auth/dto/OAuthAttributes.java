package com.ibmteam02.backend_auth.global.auth.dto;

import com.ibmteam02.backend_auth.user.domain.Role;
import com.ibmteam02.backend_auth.user.domain.User;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class OAuthAttributes {
    private Map<String, Object> attributes;
    private String nameAttributeKey;
    private String name;
    private String email;
    private String socialId;
    private String registrationId;

    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        if ("naver".equals(registrationId)) {
            return ofNaver(registrationId, "id", attributes);
        }
        if ("kakao".equals(registrationId)) {
            return ofKakao(registrationId, userNameAttributeName, attributes);
        }
        return ofGoogle(registrationId, userNameAttributeName, attributes);
    }

    private static OAuthAttributes ofKakao(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        // null safe 처리
        Map<String, Object> kakaoAccount = attributes.containsKey("kakao_account") 
                ? (Map<String, Object>) attributes.get("kakao_account") 
                : Map.of();
        
        Map<String, Object> profile = kakaoAccount.containsKey("profile") 
                ? (Map<String, Object>) kakaoAccount.get("profile") 
                : Map.of();

        String socialId = String.valueOf(attributes.get("id"));
        String email = (String) kakaoAccount.get("email");
        String nickname = (String) profile.get("nickname");
        
        // 카카오에서 이메일을 주지 않은 경우
        if (email == null || email.isBlank()) {
            email = socialId + "@kakao.local";
        }
        
        // 닉네임이 없는 경우 임시 닉네임
        if (nickname == null || nickname.isBlank()) {
            nickname = "카카오유저" + socialId.substring(0, Math.min(4, socialId.length()));
        }

        return OAuthAttributes.builder()
                .registrationId(registrationId)
                .name(nickname)
                .email(email)
                .socialId(socialId)
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .build();
    }

    private static OAuthAttributes ofGoogle(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        return OAuthAttributes.builder()
                .registrationId(registrationId)
                .name((String) attributes.get("name"))
                .email((String) attributes.get("email"))
                .socialId((String) attributes.get("sub"))
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .build();
    }

    private static OAuthAttributes ofNaver(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");

        return OAuthAttributes.builder()
                .registrationId(registrationId)
                .name((String) response.get("name"))
                .email((String) response.get("email"))
                .socialId((String) response.get("id"))
                .attributes(response)
                .nameAttributeKey(userNameAttributeName)
                .build();
    }
    

    public User toEntity() {
        return User.builder()
                .email(email)
                .username(name)
                .socialId(socialId)
                .socialType(com.ibmteam02.backend_auth.user.domain.SocialType.valueOf(registrationId.toUpperCase()))
                .role(com.ibmteam02.backend_auth.user.domain.Role.USER)
                .build();
    }
}
