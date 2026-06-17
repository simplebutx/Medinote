package com.ibmteam02.backend_auth.user.dto;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
public class UserProfileRequest {

    private String email;
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private Boolean isChild;
    private Boolean isElderly;
    private List<String> diseaseNames;
    private List<UserCautionRequest> cautions;
}
