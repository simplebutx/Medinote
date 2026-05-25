package com.ibmteam02.backend_auth.global.auth.service;

import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
public class SmsService {

    private final DefaultMessageService messageService;
    private final StringRedisTemplate redisTemplate;
    private final String fromNumber;

    public SmsService(
            @Value("${coolsms.api.key}") String apiKey,
            @Value("${coolsms.api.secret}") String apiSecret,
            @Value("${coolsms.from.number}") String fromNumber,
            StringRedisTemplate redisTemplate) {
        this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
        this.fromNumber = fromNumber;
        this.redisTemplate = redisTemplate;
    }

    // 1. 인증번호 발송
    public void sendSms(String phoneNumber) {
        String authCode = String.valueOf((int) (Math.random() * 899999) + 100000); // 6자리

        // Redis에 3분간 저장
        redisTemplate.opsForValue().set("sms:" + phoneNumber, authCode, Duration.ofMinutes(3));

        Message message = new Message();
        message.setFrom(fromNumber);
        message.setTo(phoneNumber);
        message.setText("[Mymedi] 인증번호는 [" + authCode + "] 입니다. 3분 내에 입력해주세요.");

        try {
            messageService.sendOne(new SingleMessageSendingRequest(message));
            log.info("SMS 발송 성공: {}", phoneNumber);
        } catch (Exception e) {
            log.error("SMS 발송 실패: {}", e.getMessage());
            throw new RuntimeException("문자 발송 중 오류가 발생했습니다.");
        }
    }

    // 2. 인증번호 검증
    public boolean verifySms(String phoneNumber, String code) {
        String savedCode = redisTemplate.opsForValue().get("sms:" + phoneNumber);

        if (savedCode != null && savedCode.equals(code)) {
            redisTemplate.delete("sms:" + phoneNumber);
            // 인증 완료 플래그 (10분 유지)
            redisTemplate.opsForValue().set("verified:sms:" + phoneNumber, "true", Duration.ofMinutes(10));
            return true;
        }
        return false;
    }


}
