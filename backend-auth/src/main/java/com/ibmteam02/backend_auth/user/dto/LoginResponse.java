package com.ibmteam02.backend_auth.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private Long userId;
    private String accessToken;
    private String refreshToken;
    private String email;
    private String role;
}
