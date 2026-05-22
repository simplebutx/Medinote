package com.ibmteam02.backend_auth.global.auth.controller;

import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.service.AuthService;
import com.ibmteam02.backend_auth.user.domain.UserProfileHealth;
import com.ibmteam02.backend_auth.user.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtProvider jwtProvider;

    //공통 회원가입
    @PostMapping(value = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> signup(
            @RequestPart("data") SignupRequest signupRequest,
            @RequestPart(value = "licenseImage", required = false)MultipartFile licenseImage){
        authService.signup(signupRequest, licenseImage);
        return ResponseEntity.ok("회원가입 완료");
    }

    //로그인
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest){
        LoginResponse loginResponse = authService.login(loginRequest);
        return ResponseEntity.ok(loginResponse);
    }

    // 토큰 재발급
    @PostMapping("/token/refresh")
    public ResponseEntity<LoginResponse> reissue(@RequestBody Map<String, String> request) {
        LoginResponse response = authService.reissue(request.get("refreshToken"));
        return ResponseEntity.ok(response);
    }

    // 로그아웃 - JWT에서 이메일 추출
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader("Authorization") String bearerToken) {
        String token = bearerToken.replace("Bearer ", "");
        String email = jwtProvider.getEmailFromToken(token);
        authService.logout(email);
        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다"));
    }
}
