package com.ibmteam02.backend_auth.user.dto;

import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class ProfileUpdateRequest {
    private String username;
    private LocalDate birthDate;
    private Gender gender;
    private Role role; // 추가: USER or PHARMACIST

    //건강정보
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private Boolean isChild;
    private Boolean isElderly;

    //기저질환 리스트
    private List<String> diseases;

    //약국명
    private String docNumber;
}
