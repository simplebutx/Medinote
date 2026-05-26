package com.ibmteam02.backend_auth.global.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;

    /* 이메일 인증 기능 잠시 중단
    public void sendAuthCode(String email) {
        String authCode = String.valueOf((int) (Math.random() * 899999) + 100000);
...
    public boolean isVerified(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("verified:" + email));
    }
    */

}
