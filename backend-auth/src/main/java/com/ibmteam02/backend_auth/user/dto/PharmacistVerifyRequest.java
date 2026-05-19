package com.mymedi.backend.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PharmacistVerifyRequest {
    //약사 회원가입 2단계 추가 정보
    private String email;
    private String docNumber;
    private String licenseNumber;
}
