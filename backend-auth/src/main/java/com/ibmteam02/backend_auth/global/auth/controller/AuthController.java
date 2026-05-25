package com.ibmteam02.backend_auth.global.auth.controller;

import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.service.AuthService;
import com.ibmteam02.backend_auth.user.dto.*;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtProvider jwtProvider;

    // 공통 회원가입 1단계
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupRequest signupRequest) {
        log.info("signup request: email={}, username={}, birthDate={}, gender={}, role={}",
                signupRequest.getEmail(),
                signupRequest.getUsername(),
                signupRequest.getBirthDate(),
                signupRequest.getGender(),
                signupRequest.getRole());
        authService.signup(signupRequest);
        return ResponseEntity.ok("회원가입 완료");
    }

    // 일반 유저 추가 정보 입력
    @PostMapping("/user/profile")
    public ResponseEntity<String> addUserProfile(@RequestBody UserProfileRequest userProfileRequest) {
        authService.addUserProfile(userProfileRequest.getEmail(), userProfileRequest);
        return ResponseEntity.ok("일반 유저 등록 완료");
    }

    // 기저질환 자동완성
    @GetMapping("/diseases/suggest")
    public ResponseEntity<List<String>> suggestDiseases(@RequestParam String keyword) {
        return ResponseEntity.ok(authService.suggestDiseaseNames(keyword));
    }

    // 약사 추가 정보 입력
    @PostMapping(value = "/pharmacists/verification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> verifyPharmacist(
            @RequestPart("data") PharmacistVerifyRequest pharmacistVerifyRequest,
            @RequestPart("licenseImage") MultipartFile licenseImage
    ) {
        authService.addPharmacistProfile(
                pharmacistVerifyRequest.getEmail(),
                pharmacistVerifyRequest,
                licenseImage
        );
        return ResponseEntity.ok("약사 면허 인증 요청 완료");
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
        LoginResponse loginResponse = authService.login(loginRequest);
        return ResponseEntity.ok(loginResponse);
    }

    // 토큰 재발급
    @PostMapping("/token/refresh")
    public ResponseEntity<LoginResponse> reissue(@RequestBody Map<String, String> request) {
        LoginResponse response = authService.reissue(request.get("refreshToken"));
        return ResponseEntity.ok(response);
    }

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader("Authorization") String bearerToken
    ) {
        String token = bearerToken.replace("Bearer ", "");
        String email = jwtProvider.getEmailFromToken(token);
        authService.logout(email);
        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다"));
    }

    //마이페이지 정보 조회
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @AuthenticationPrincipal String email){
        return ResponseEntity.ok(authService.getMyProfile(email));
    }

    //마이페이지 정보 수정
    @PatchMapping
    public ResponseEntity<String> updateMyProfile(
            @AuthenticationPrincipal String email,
            @RequestBody ProfileUpdateRequest profileUpdateRequest){
        authService.updateMyProfile(email,profileUpdateRequest);
        return ResponseEntity.ok("프로필 정보 수정 완료");
    }


}
