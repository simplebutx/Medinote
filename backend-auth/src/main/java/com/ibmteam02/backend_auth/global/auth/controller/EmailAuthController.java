package com.ibmteam02.backend_auth.global.auth.controller;

import com.ibmteam02.backend_auth.global.auth.dto.EmailRequest;
import com.ibmteam02.backend_auth.global.auth.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/email")
@RequiredArgsConstructor
public class EmailAuthController {

    private final EmailService emailService;

    /* 이메일 인증 기능 잠시 중단
    //이메일 인증 코드 발송
    @PostMapping("/verification-code")
    public ResponseEntity<EmailRequest.CodeResponse> sendEmail(@RequestBody EmailRequest emailRequest) {
        emailService.sendAuthCode(emailRequest.getEmail());
        return ResponseEntity.ok(new EmailRequest.CodeResponse("인증번호가 발송되었습니다.", 180));
    }

    //이메일 인증번호 확인 검증 API
    @PostMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestBody EmailRequest emailRequest) {
        System.out.println("인증코드: " + emailRequest.getCode());
        boolean isVerified = emailService.verifyCode(emailRequest.getEmail(), emailRequest.getCode());

        if (isVerified) {
            emailService.setVerifiedFlag(emailRequest.getEmail());
            return ResponseEntity.ok(new EmailRequest.VerifyResponse("이메일 인증 성공", true));
        }

        return ResponseEntity.status(400).body(new EmailRequest.VerifyResponse("인증번호가 일치하지 않습니다", false));
    }
    */

}
