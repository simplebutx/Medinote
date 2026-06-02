package com.ibmteam02.backend_auth.admin.service;

import com.ibmteam02.backend_auth.admin.dto.PharmacistApprovalResponse;
import com.ibmteam02.backend_auth.admin.dto.UserManagementResponse;
import com.ibmteam02.backend_auth.global.auth.service.S3Service;
import com.ibmteam02.backend_auth.user.domain.*;
import com.ibmteam02.backend_auth.user.repository.PharmacistProfileRepository;
import com.ibmteam02.backend_auth.user.repository.UserChronicDiseaseRepository;
import com.ibmteam02.backend_auth.user.repository.UserProfileHealthRepository;
import com.ibmteam02.backend_auth.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository userRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;
    private final UserProfileHealthRepository userProfileHealthRepository;
    private final UserChronicDiseaseRepository userChronicDiseaseRepository;
    private final S3Service s3Service;

    //승인 대기 중인 약사 목록 조회
    @Transactional(readOnly = true)
    public List<PharmacistApprovalResponse> getPendingPharmacists(String role) {
        // 1. 관리자 권한 체크
        if (!"ADMIN".equals(role) && !"ROLE_ADMIN".equals(role)) {
            throw new RuntimeException("관리자만 조회 가능합니다");
        }

        // 2. WAITING_APPROVAL 상태인 유저 중, 약사이고 프로필(2단계)까지 마친 사람만 필터링
        return userRepository.findByStatus(UserStatus.WAITING_APPROVAL).stream()
                .filter(user -> user.getRole() == Role.PHARMACIST)
                .map(user -> {
                    // 프로필이 없는 사람은 2단계를 안 한 것이므로 제외하기 위해 Optional 사용
                    return pharmacistProfileRepository.findByUser(user)
                            .map(profile -> PharmacistApprovalResponse.builder()
                                    .userId(user.getId())
                                    .email(user.getEmail())
                                    .username(user.getUsername())
                                    .docNumber(profile.getDocNumber())
                                    .licenseNumber(profile.getLicenseNumber())
                                    .licenseImage(profile.getLicenseImage() != null
                                            ? s3Service.getPresignedUrl(profile.getLicenseImage()) : null)
                                    .build())
                            .orElse(null);
                })
                .filter(java.util.Objects::nonNull) // null(프로필 없는 사람) 제외
                .toList();
    }

    //약사 승인 처리
    @Transactional
    public void approvePharmacist(Long userId, String adminRole) {
        if (!"ADMIN".equals(adminRole) && !"ROLE_ADMIN".equals(adminRole)) {
            throw new RuntimeException("관리자만 승인 처리 가능");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저"));

        if (user.getRole() != Role.PHARMACIST) {
            throw new RuntimeException("약사 계정이 아닙니다");
        }

        user.activateGeneralUser();
    }

    //약사 승인 거절
    @Transactional
    public void rejectPharmacist(Long userId, String adminRole) {
        if (!"ADMIN".equals(adminRole) && !"ROLE_ADMIN".equals(adminRole)) {
            throw new RuntimeException("관지라만 거절 처리가 가능합니다");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다"));

        if (user.getRole() != Role.PHARMACIST) {
            throw new RuntimeException("약사 계정이 아닙니다");
        }

        user.rejectPharmacist();
    }

    //전체 회원 조회 (관리자용)
    @Transactional(readOnly = true)
    public List<UserManagementResponse> getAllUsers(String adminRole) {
        if (!"ADMIN".equals(adminRole) && !"ROLE_ADMIN".equals(adminRole)) {
            throw new RuntimeException("관리자만 조회 가능합니다");
        }
        return userRepository.findAll().stream()
                .map(user -> {
                    UserProfileHealth health = userProfileHealthRepository.findByUser(user).orElse(null);
                    List<String> diseases = userChronicDiseaseRepository.findByUser(user).stream()
                            .map(UserChronicDisease::getDiseaseName)
                            .toList();

                    return UserManagementResponse.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .username(user.getUsername())
                            .birthDate(user.getBirthDate())
                            .gender(user.getGender())
                            .role(user.getRole())
                            .status(user.getStatus())
                            .createdAt(user.getCreatedAt())
                            .isPregnant(health != null ? health.getIsPregnant() : false)
                            .isBreastfeeding(health != null ? health.getIsBreastfeeding() : false)
                            .isSmoking(health != null ? health.getIsSmoking() : false)
                            .isDrinking(health != null ? health.getIsDrinking() : false)
                            .chronicDiseases(diseases)
                            .build();
                })
                .toList();
    }

    //회원 탈퇴 (삭제)
    @Transactional
    public void deleteUser(Long userId, String adminRole) {
        if (!"ADMIN".equals(adminRole) && !"ROLE_ADMIN".equals(adminRole)) {
            throw new RuntimeException("관리자만 삭제 처리가 가능합니다");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(()-> new RuntimeException("존재하지 않는 유저입니다"));

        userRepository.delete(user);
    }

}
