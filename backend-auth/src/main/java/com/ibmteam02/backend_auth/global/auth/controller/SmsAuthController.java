package com.ibmteam02.backend_auth.global.auth.controller;

import com.ibmteam02.backend_auth.global.auth.service.SmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/sms")
@RequiredArgsConstructor
public class SmsAuthController {

    private final SmsService smsService;

    // 인증번호 발송
    @PostMapping("/send")
    public ResponseEntity<String> sendSms(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return ResponseEntity.badRequest().body("휴대폰 번호를 입력해주세요.");
        }
        smsService.sendSms(phoneNumber);
        return ResponseEntity.ok("인증번호가 발송되었습니다.");
    }

    // 인증번호 검증
    @PostMapping("/verify")
    public ResponseEntity<Boolean> verifySms(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String code = request.get("code");
        
        if (phoneNumber == null || code == null) {
            return ResponseEntity.badRequest().body(false);
        }

        boolean isVerified = smsService.verifySms(phoneNumber, code);
        if (isVerified) {
            return ResponseEntity.ok(true);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(false);
    }
}
