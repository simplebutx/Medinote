package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.domain.RefreshToken;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.repository.RefreshTokenRepository;
import com.ibmteam02.backend_auth.global.error.exception.CustomException;
import com.ibmteam02.backend_auth.global.error.exception.ErrorCode;
import com.ibmteam02.backend_auth.user.domain.*;
import com.ibmteam02.backend_auth.user.dto.*;
import com.ibmteam02.backend_auth.user.repository.*;
import com.ibmteam02.backend_auth.global.util.EncryptionUtils;

import java.util.List;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileHealthRepository userProfileHealthRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final DiseaseMasterRepository diseaseMasterRepository;
    private final UserChronicDiseaseRepository userChronicDiseaseRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;
    private final S3Service s3Service;
    private final SmsService smsService;
    private final EncryptionUtils encryptionUtils;

    // 질병 명 추천 (자동완성용)
    public List<String> suggestDiseaseNames(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }

        return diseaseMasterRepository.findTop10ByDiseaseNameContaining(keyword).stream()
                .map(DiseaseMaster::getDiseaseName)
                .distinct()
                .toList();
    }

    // 회원가입 1단계: 기본 정보 등록
    public void signup(SignupRequest signupRequest) {
        // 이메일 해시를 이용한 중복 체크 (보안 강화)
        String emailHash = encryptionUtils.hash(signupRequest.getEmail());
        if (userRepository.existsByEmailHash(emailHash)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }

        String encodedPassword = passwordEncoder.encode(signupRequest.getPassword());

        User user = User.builder()
                .email(signupRequest.getEmail())
                .emailHash(emailHash)
                .password(encodedPassword)
                .username(signupRequest.getUsername())
                .birthDate(signupRequest.getBirthDate())
                .gender(signupRequest.getGender())
                .role(signupRequest.getRole())
                .build();

        userRepository.save(user);
    }

    // 2단계: 일반 유저 건강 정보 및 보유 질환 추가 입력
    @Transactional
    public void addUserProfile(String email, UserProfileRequest userProfileRequest) {
        // 해시 검색으로 유저 조회
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        UserProfileHealth health = UserProfileHealth.builder()
                .user(user)
                .isPregnant(Boolean.TRUE.equals(userProfileRequest.getIsPregnant()))
                .isBreastfeeding(Boolean.TRUE.equals(userProfileRequest.getIsBreastfeeding()))
                .isSmoking(Boolean.TRUE.equals(userProfileRequest.getIsSmoking()))
                .isDrinking(Boolean.TRUE.equals(userProfileRequest.getIsDrinking()))
                .isChild(Boolean.TRUE.equals(userProfileRequest.getIsChild()))
                .isElderly(Boolean.TRUE.equals(userProfileRequest.getIsElderly()))
                .build();

        userProfileHealthRepository.save(health);

        // 질병 정보 저장
        List<String> diseaseNames = userProfileRequest.getDiseaseNames();
        if (diseaseNames != null) {
            diseaseNames.stream()
                    .filter(StringUtils::hasText)
                    .distinct()
                    .forEach(diseaseName -> {
                        DiseaseMaster master = diseaseMasterRepository.findByDiseaseName(diseaseName).orElse(null);
                        UserChronicDisease userChronicDisease = UserChronicDisease.builder()
                                .user(user)
                                .diseaseMaster(master)
                                .diseaseName(diseaseName)
                                .build();
                        userChronicDiseaseRepository.save(userChronicDisease);
                    });
        }

        // 유저 상태 활성화
        user.activateGeneralUser();
        userRepository.save(user);
    }

    // 약사 회원가입 2단계: 약사 추가 정보 및 면허증 이미지 등록
    @Transactional
    public void addPharmacistProfile(String email, PharmacistVerifyRequest pharmacistVerifyRequest, MultipartFile image) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        // 실제 S3에 이미지 업로드
        String imageUrl = s3Service.upload(image);

        PharmacistProfile pharmacistProfile = PharmacistProfile.builder()
                .user(user)
                .docNumber(pharmacistVerifyRequest.getDocNumber())
                .licenseNumber(pharmacistVerifyRequest.getLicenseNumber())
                .licenseImage(imageUrl)
                .build();
        pharmacistProfileRepository.save(pharmacistProfile);
        
        // 승인 대기 상태로 변경
        user.setWaitingForApproval();
    }

    // 로그인: 이메일/비밀번호 인증
    public LoginResponse login(LoginRequest loginRequest) {
        String emailHash = encryptionUtils.hash(loginRequest.getEmail());
        
        // 1. 해시로 검색 시도, 없으면 평문 마이그레이션(기존 가입자) 진행
        User user = userRepository.findByEmailHash(emailHash)
                .orElseGet(() -> {
                    User legacyUser = userRepository.findByRawEmail(loginRequest.getEmail())
                            .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다"));
                    
                    legacyUser.updateEmailHash(emailHash);
                    return userRepository.save(legacyUser);
                });

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다");
        }

        // 가입 대기 상태 체크
        if (user.getStatus() == UserStatus.PENDING) {
            throw new IllegalArgumentException("회원가입이 완료되지 않은 회원입니다");
        }

        // 약사는 승인 대기 중이어도 로그인 가능하도록 수정
        if (user.getStatus() == UserStatus.WAITING_APPROVAL && user.getRole() != Role.PHARMACIST) {
            throw new IllegalArgumentException("회원가입이 완료되지 않은 계정입니다");
        }

        // 토큰 생성 및 저장
        String accessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshTokenValue = jwtProvider.createRefreshToken(user.getEmail());

        RefreshToken refreshToken = new RefreshToken(
                user.getEmail(),
                refreshTokenValue,
                14 * 24 * 60 * 60L
        );

        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(user.getId(), accessToken, refreshTokenValue, user.getEmail(), user.getRole().name(), user.getStatus());
    }

    // Refresh Token 재발급 로직
    public LoginResponse reissue(String refreshToken) {
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String email = jwtProvider.getEmailFromToken(refreshToken);

        RefreshToken savedToken = refreshTokenRepository.findById(email)
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (!savedToken.getRefreshToken().equals(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtProvider.createRefreshToken(user.getEmail());

        refreshTokenRepository.save(new RefreshToken(user.getEmail(), newRefreshToken, 14 * 24 * 60 * 60L));

        return new LoginResponse(user.getId(), newAccessToken, newRefreshToken, user.getEmail(), user.getRole().name(), user.getStatus());
    }

    // 로그아웃: 리프레시 토큰 삭제
    public void logout(String email) {
        refreshTokenRepository.deleteById(email);
    }

    // 마이페이지 정보 조회 (암호화된 이메일 등 자동 복호화)
    @Transactional
    public UserProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        UserProfileHealth userProfileHealth = userProfileHealthRepository.findByUser(user).orElse(null);

        List<String> diseases = userChronicDiseaseRepository.findByUser(user).stream()
                .map(UserChronicDisease::getDiseaseName)
                .toList();

        PharmacistProfile pharmacistProfile = pharmacistProfileRepository.findByUser(user).orElse(null);

        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .birthDate(user.getBirthDate())
                .gender(user.getGender())
                .role(user.getRole())
                .status(user.getStatus())
                .isPregnant(userProfileHealth != null ? userProfileHealth.getIsPregnant() : false)
                .isBreastfeeding(userProfileHealth != null ? userProfileHealth.getIsBreastfeeding() : false)
                .isSmoking(userProfileHealth != null ? userProfileHealth.getIsSmoking() : false)
                .isDrinking(userProfileHealth != null ? userProfileHealth.getIsDrinking() : false)
                .isChild(userProfileHealth != null ? userProfileHealth.getIsChild() : false)
                .isElderly(userProfileHealth != null ? userProfileHealth.getIsElderly() : false)
                .chronicDiseases(diseases)
                .docNumber(pharmacistProfile != null ? pharmacistProfile.getDocNumber() : null)
                .licenseNumber(pharmacistProfile != null ? pharmacistProfile.getLicenseNumber() : null)
                .licenseImage(pharmacistProfile != null && pharmacistProfile.getLicenseImage() != null 
                        ? s3Service.getPresignedUrl(pharmacistProfile.getLicenseImage()) 
                        : null)
                .build();
    }

    // 마이페이지 회원 정보 수정
    @Transactional
    public void updateMyProfile(String email, ProfileUpdateRequest profileUpdateRequest) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 역할(Role) 업데이트
        if (profileUpdateRequest.getRole() != null) {
            user.updateRole(profileUpdateRequest.getRole());
        }

        // 기본 정보 수정 (이름, 생년월일, 성별)
        user.updateBasicProfile(
                profileUpdateRequest.getUsername(),
                profileUpdateRequest.getBirthDate(),
                profileUpdateRequest.getGender()
        );

        // 유저일 경우에만 건강 정보 수정
        if (user.getRole() == Role.USER) {
            UserProfileHealth userProfileHealth = userProfileHealthRepository.findByUser(user)
                    .orElseGet(() -> {
                        if (profileUpdateRequest.getIsPregnant() == null) return null;
                        return UserProfileHealth.builder().user(user).build();
                    });

            if (userProfileHealth != null) {
                userProfileHealth.updateHealth(
                        profileUpdateRequest.getIsPregnant(),
                        profileUpdateRequest.getIsBreastfeeding(),
                        profileUpdateRequest.getIsSmoking(),
                        profileUpdateRequest.getIsDrinking(),
                        profileUpdateRequest.getIsChild(),
                        profileUpdateRequest.getIsElderly()
                );
                userProfileHealthRepository.save(userProfileHealth);
            }

            // 질병 정보 초기화 후 재등록
            userChronicDiseaseRepository.deleteByUser(user);

            if (profileUpdateRequest.getDiseases() != null) {
                for (String diseaseName : profileUpdateRequest.getDiseases()) {
                    diseaseMasterRepository.findByDiseaseName(diseaseName)
                            .ifPresent(diseaseMaster -> {
                                userChronicDiseaseRepository.save(new UserChronicDisease(user, diseaseMaster, diseaseMaster.getDiseaseName()));
                            });
                }
            }
        }
    }

    // 약사 프로필 수정 (면허 재인증 포함)
    @Transactional
    public void updatePharmacistProfile(String email, PharmacistVerifyRequest request, MultipartFile image) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        PharmacistProfile profile = pharmacistProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("약사 프로필이 존재하지 않습니다"));

        String imageUrl = profile.getLicenseImage();
        if (image != null && !image.isEmpty()) {
            imageUrl = s3Service.upload(image);
        }

        profile.updateLicenseInfo(request.getDocNumber(), request.getLicenseNumber(), imageUrl);
        user.setWaitingForApproval();
        userRepository.save(user);
    }

    // 본인 계정 탈퇴 및 삭제 (Cascade 설정으로 연관 데이터 자동 삭제)
    @Transactional
    public void withdraw(String email){
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(()->new CustomException(ErrorCode.USER_NOT_FOUND));

        // S3 이미지 등 외부 리소스 정리
        if (user.getRole() == Role.PHARMACIST && user.getPharmacistProfile() != null){
            String imageKey = user.getPharmacistProfile().getLicenseImage();
            if(imageKey != null && !imageKey.equals("DELETED_DUE_TO_PRIVACY")){
                s3Service.deleteFile(imageKey);
            }
        }

        refreshTokenRepository.deleteById(email);
        userRepository.delete(user);
    }

    // 비밀번호 재설정 문자 발송 (SNS 계정 제외)
    public void sendPasswordResetSms(PasswordRequest.FindRequest request) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(request.getEmail()))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getSocialType() != null) {
            throw new CustomException(ErrorCode.IS_SOCIAL_USER);
        }

        smsService.sendSms(request.getPhoneNumber());
    }

    // 비밀번호 재설정 완료 (인증 번호 없이 간소화됨)
    @Transactional
    public void resetPassword(PasswordRequest.ResetRequest request) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(request.getEmail()))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getSocialType() != null) {
            throw new CustomException(ErrorCode.IS_SOCIAL_USER);
        }

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // 로그인 상태에서 비밀번호 직접 수정
    @Transactional
    public void updatePassword(String email, PasswordRequest.UpdateRequest request) {
        User user = userRepository.findByEmailHash(encryptionUtils.hash(email))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getSocialType() != null) {
            throw new CustomException(ErrorCode.IS_SOCIAL_USER);
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
