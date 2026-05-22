package com.ibmteam02.backend_auth.user.dto;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserProfileRequest {

    private String email;
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private List<String> diseaseNames;
}
