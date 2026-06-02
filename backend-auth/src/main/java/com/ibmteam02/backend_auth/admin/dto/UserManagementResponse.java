package com.ibmteam02.backend_auth.admin.dto;

import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserManagementResponse {
    private Long id;
    private String email;
    private String username;
    private LocalDate birthDate;
    private Gender gender;
    private Role role; // USER, PHARMACIST, ADMIN
    private UserStatus status; // ACTIVE, WAITING_APPROVAL, PENDING, REJECTED
    private LocalDateTime createdAt;

    // 추가 정보 (일반 유저용)
    private Boolean isPregnant;
    private Boolean isBreastfeeding;
    private Boolean isSmoking;
    private Boolean isDrinking;
    private List<String> chronicDiseases;
}
