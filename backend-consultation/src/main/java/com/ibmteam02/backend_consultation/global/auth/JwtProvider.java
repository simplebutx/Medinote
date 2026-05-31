package com.ibmteam02.backend_consultation.global.auth;

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

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

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

    //토큰에서 role 꺼내기
    public String getRoleFromToken(String token){
        return getClaims(token).get("role",String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
