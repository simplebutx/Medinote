package com.ibmteam02.backend_auth.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacistApprovalResponse {
    
    private Long userId;
    private String email;
    private String username;
    
    // 약사 면허 관련 정보
    private String docNumber;      // 소속 약국명
    private String licenseNumber;  // 면허 번호
    private String licenseImage;   // 면허증 이미지 (Pre-signed URL)
}
