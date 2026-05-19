package com.mymedi.backend.global.auth.dto;

import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    private String email;
    private String code;

    @Getter
    @AllArgsConstructor
    public static class CodeResponse {
        private String message;
        private long expiresInSeconds; // 기획서 명세: expiresInSeconds 반환 (3분 = 180초)
    }

    @Getter
    @AllArgsConstructor
    public static class VerifyResponse {
        private String message;
        private boolean verified; // 기획서 명세: verified 여부 반환 (true/false)
    }
}
