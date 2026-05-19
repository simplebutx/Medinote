package com.mymedi.backend.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserProfileRequest {
    //일반 사용자 회원가입 2단계 추가 정보
    private String email;
    private String allergies; //알러지
    private String diseases; //질병
}
