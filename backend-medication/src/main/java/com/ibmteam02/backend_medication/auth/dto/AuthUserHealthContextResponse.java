package com.ibmteam02.backend_medication.auth.dto;

import java.util.List;

public record AuthUserHealthContextResponse(
        boolean isPregnant,
        boolean isBreastfeeding,
        boolean isSmoking,
        boolean isDrinking,
        boolean isChild,
        boolean isElderly,
        List<String> chronicDiseases
) {
}
