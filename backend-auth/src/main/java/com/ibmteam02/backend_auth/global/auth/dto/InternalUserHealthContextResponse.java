package com.ibmteam02.backend_auth.global.auth.dto;

import java.util.List;

public record InternalUserHealthContextResponse(
        boolean isPregnant,
        boolean isBreastfeeding,
        boolean isSmoking,
        boolean isDrinking,
        List<String> chronicDiseases
) {
}
