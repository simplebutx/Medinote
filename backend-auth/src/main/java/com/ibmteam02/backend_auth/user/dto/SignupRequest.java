package com.ibmteam02.backend_auth.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {
    private String email;
    private String password;
    private String username;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    private Gender gender; //MALE or FEMALE
    private Role role; // USER or PHARMACIST

    //일반 유저 건강 정보 (선택)
    private Boolean isPregnant; // 임산부 여부
    private Boolean isBreastfeeding; // 모유 수유 여부
    private Boolean isSmoking; // 흡연 여부
    private Boolean isDrinking; // 음주 여부
    private Boolean isChild; // 소아 여부
    private Boolean isElderly; // 고령 여부
    private String diseaseName; // 사용자 질병명

    //약사 추가 정보
    private String docNumber; //약국명
    private String licenseNumber; //면허 번호
}
