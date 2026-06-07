package com.ibmteam02.backend_auth.global.auth.dto;

import com.ibmteam02.backend_auth.user.domain.Gender;
import java.time.LocalDate;
import java.util.List;

public record InternalUserHealthContextResponse(
        String username,
        LocalDate birthDate,
        Gender gender,
        boolean isPregnant,
        boolean isBreastfeeding,
        boolean isSmoking,
        boolean isDrinking,
        boolean isChild,
        boolean isElderly,
        List<String> chronicDiseases
) {
}
