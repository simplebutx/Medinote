package com.ibmteam02.backend_auth.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserProfileRequest {
    //일반 사용자 회원가입 2단계 추가 정보
    private String email;
    private Boolean isPregnant; // 임산부 여부
    private Boolean isBreastfeeding; // 모유 수유 여부
    private Boolean isSmoking; // 흡연 여부
    private Boolean isDrinking; // 음주 여부
    private String diseaseName; // 사용자 질병명
}
