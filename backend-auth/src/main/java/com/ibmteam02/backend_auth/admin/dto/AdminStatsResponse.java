package com.ibmteam02.backend_auth.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminStatsResponse {
    private long totalUserCount; // 전체 회원 수
    private long totalPharmacistCount; // 전체 약사 수
    private long pendingPharmacistCount; //승인 대기중인 약사 수
}
