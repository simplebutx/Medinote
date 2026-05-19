package com.mymedi.backend.global.auth.service;

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

    public void sendAuthCode(String email) {
        String authCode = String.valueOf((int) (Math.random() * 899999) + 100000);

        redisTemplate.opsForValue().set(email, authCode, Duration.ofMinutes(3));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Mymedi 인증번호입니다");
        message.setText("인증번호: " + authCode);

        mailSender.send(message);
    }

    public boolean verifyCode(String email, String code) {
        String savedCode = redisTemplate.opsForValue().get(email);


        if (savedCode == null) {
            return false;
        }
        if (savedCode.equals(code)) {
            redisTemplate.delete(email);
            return true;
        }
        return false;
    }

    public void setVerifiedFlag(String email) {
        redisTemplate.opsForValue().set("verified:" + email, "true", Duration.ofMinutes(10));
    }

    public boolean isVerified(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("verified:" + email));
    }

}
