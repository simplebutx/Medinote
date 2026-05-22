package com.ibmteam02.backend_auth.user.dto;

import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.s3.endpoints.internal.Value;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {
    private String email;
    private String username;
    private LocalDateTime birthDate;
    private Gender gender;
    private Role role;

    //일반 유저 건강 정보
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;

    //일반 유저 기저질환
    private List<String> chronicDiseases;

    //약사 유저 정보
    private String docNumber;
    private String licenseNumber;
    private String licenseImage;

}
