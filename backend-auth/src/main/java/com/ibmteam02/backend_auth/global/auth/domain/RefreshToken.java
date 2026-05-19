package com.mymedi.backend.global.auth.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

@Getter
@AllArgsConstructor
@RedisHash(value = "refreshToken", timeToLive = 1209600)
public class RefreshToken {
    @Id
    private String email;

    private String refreshToken;

    //토큰의 유효기간 설정, redis가 자동으로 삭제해줌
    @TimeToLive
    private Long expiration;
}
