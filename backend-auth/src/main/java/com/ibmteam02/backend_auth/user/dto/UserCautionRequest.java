package com.ibmteam02.backend_auth.user.dto;

public record UserCautionRequest(
        Long itemSeq,
        String itemName,
        String ingredientCode,
        String ingredientName,
        String reason,
        String cautionType,
        String memo
) {
}
