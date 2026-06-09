package com.ibmteam02.backend_auth.user.dto;

import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.s3.endpoints.internal.Value;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {
    private String email;
    private String username;
    private LocalDate birthDate;
    private Gender gender;
    private Role role;
    private UserStatus status; // 승인 상태

    //일반 유저 건강 정보
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private Boolean isChild;
    private Boolean isElderly;

    //일반 유저 기저질환
    private List<String> chronicDiseases;

    //약사 유저 정보
    private String docNumber;
    private String licenseNumber;
    private String licenseImage;

}
