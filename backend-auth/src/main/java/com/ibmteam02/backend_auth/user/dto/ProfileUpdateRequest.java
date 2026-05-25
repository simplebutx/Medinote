package com.ibmteam02.backend_auth.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ProfileUpdateRequest {
    private String username;

    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;

    //기저질환 리스트
    private List<String> diseases;

    //약국명
    private String docNumber;
}
