package com.mymedi.backend.global.auth.controller;

import com.mymedi.backend.global.auth.jwt.JwtProvider;
import com.mymedi.backend.global.auth.service.AuthService;
import com.mymedi.backend.user.dto.*;
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
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupRequest signupRequest){
        log.info("signup request: email={}, username={}, birthDate={}, gender={}, role={}",
                signupRequest.getEmail(),
                signupRequest.getUsername(),
                signupRequest.getBirthDate(),
                signupRequest.getGender(),
                signupRequest.getRole());
        authService.signup(signupRequest);
        return ResponseEntity.ok("회원가입 완료");
    }

    //일반 유저 추가 정보 입력
    @PostMapping("/user/profile")
    public ResponseEntity<String> addUserProfile(
            @RequestBody UserProfileRequest userProfileRequest){

        authService.addUserProfile(userProfileRequest.getEmail(),userProfileRequest);

        return ResponseEntity.ok("일반 유저 추가 정보 등록 완료");
    }

    //약사 유저 추가 정보 입력
    @PostMapping(value = "/pharmacists/verification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> verifyPharmacist(
            @RequestPart("data")PharmacistVerifyRequest pharmacistVerifyRequest,
            @RequestPart("licenseImage")MultipartFile licenseImage){

        authService.addPharmacistProfile(pharmacistVerifyRequest.getEmail(),pharmacistVerifyRequest,licenseImage);
        return ResponseEntity.ok("약사 면허 인증 신청 완료");
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
