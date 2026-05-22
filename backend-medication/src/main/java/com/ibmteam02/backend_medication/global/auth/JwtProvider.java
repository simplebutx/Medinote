package com.ibmteam02.backend_medication.global.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private final SecretKey secretKey;

    public JwtProvider(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // 토큰을 가져와서 내부 데이터들(claims)를 꺼내기
    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // claims안에 userId 꺼내기
    public Long getUserIdFromToken(String token) {
        Object userId = getClaims(token).get("userId");

        if (userId instanceof Integer integerUserId) {
            return integerUserId.longValue();
        }
        if (userId instanceof Long longUserId) {
            return longUserId;
        }

        return Long.valueOf(String.valueOf(userId));
    }

    // 토큰 정상인지 검증
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
