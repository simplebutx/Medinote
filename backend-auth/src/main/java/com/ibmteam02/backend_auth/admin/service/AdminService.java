package com.ibmteam02.backend_auth.admin.service;

import com.ibmteam02.backend_auth.admin.dto.PharmacistApprovalResponse;
import com.ibmteam02.backend_auth.global.auth.service.S3Service;
import com.ibmteam02.backend_auth.user.domain.PharmacistProfile;
import com.ibmteam02.backend_auth.user.domain.Role;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import com.ibmteam02.backend_auth.user.repository.PharmacistProfileRepository;
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
    private final S3Service s3Service;

    //승인 대기 중인 약사 목록 조회
    @Transactional(readOnly = true)
    public List<PharmacistApprovalResponse> getPendingPharmacists() {
        return userRepository.findByStatus(UserStatus.WAITING_APPROVAL).stream()
                .filter(user -> user.getRole() == Role.PHARMACIST)
                .map(user -> {
                    PharmacistProfile pharmacistProfile = pharmacistProfileRepository.findByUser(user).orElse(null);

                    return PharmacistApprovalResponse.builder()
                            .userId(user.getId())
                            .email(user.getEmail())
                            .username(user.getUsername())
                            .docNumber(pharmacistProfile != null ? pharmacistProfile.getDocNumber() : null)
                            .licenseNumber(pharmacistProfile !=null ? pharmacistProfile.getLicenseNumber() :null)
                            .licenseImage(pharmacistProfile != null && pharmacistProfile.getLicenseImage() !=null
                            ? s3Service.getPresignedUrl(pharmacistProfile.getLicenseImage()) : null)
                            .build();
                })
                .toList();
    }

}
