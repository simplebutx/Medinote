package com.ibmteam02.backend_auth.global.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long expirationTime;
    //refreshToken 토큰 발급
    private final long refreshTokenExpirationTime = 14 * 24 * 60 * 60 * 1000L;

    // 생성자 주입: yml의 값을 가져와 final 키워드로 열쇠를 고정 (실무 표준)
    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationTime) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
    }

    // [발급] 로그인 성공 시 accessToken 토큰 생성
    public String createToken(Long userId, String email, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationTime))
                .signWith(secretKey)
                .compact();
    }


    // Refresh Token 생성 (Payload: email 포함)
    public String createRefreshToken(String email){
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationTime);

        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    // [해석] 토큰 내용물 확인 (getPayload() 사용)
    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // [추출] 토큰에서 이메일(Subject) 꺼내기
    public String getEmailFromToken(String token) {
        return getClaims(token).getSubject();
    }

    // [추출] 토큰에서 id 꺼내기
    public Long getUserIdFromToken(String token) {
        Object userId = getClaims(token).get("userId");
        if (userId instanceof Integer i) {
            return i.longValue();
        }
        if (userId instanceof Long l) {
            return l;
        }
        return Long.valueOf(String.valueOf(userId));
    }

    // [추출] 토큰에서 role 꺼내기
    public String getRoleFromToken(String token) {
        return (String) getClaims(token).get("role");
    }

    // [검증] 토큰이 유효한지 체크
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            log.error("JWT 검증 실패: {}", e.getMessage());
            return false;
        }
    }
}
