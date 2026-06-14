package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.domain.RefreshToken;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.repository.RefreshTokenRepository;
import com.ibmteam02.backend_auth.global.error.exception.CustomException;
import com.ibmteam02.backend_auth.global.error.exception.ErrorCode;
import com.ibmteam02.backend_auth.user.domain.*;
import com.ibmteam02.backend_auth.user.dto.*;
import com.ibmteam02.backend_auth.user.repository.*;

import java.util.List;

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

    public List<String> suggestDiseaseNames(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }

        return diseaseMasterRepository.findTop10ByDiseaseNameContaining(keyword).stream()
                .map(diseaseMaster -> diseaseMaster.getDiseaseName())
                .distinct()
                .toList();
    }

    // 회원가입 1단계
    public void signup(SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }

        String encodedPassword = passwordEncoder.encode(signupRequest.getPassword());

        User user = User.builder()
                .email(signupRequest.getEmail())
                .password(encodedPassword)
                .username(signupRequest.getUsername())
                .birthDate(signupRequest.getBirthDate())
                .gender(signupRequest.getGender())
                .role(signupRequest.getRole())
                .build();

        userRepository.save(user);
    }

    // 2단계 일반 유저 건강 정보 추가 입력
    @Transactional
    public void addUserProfile(String email, UserProfileRequest userProfileRequest) {
        User user = userRepository.findByEmail(email)
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

        List<String> diseaseNames = userProfileRequest.getDiseaseNames();
        if (diseaseNames != null) {
            diseaseNames.stream()
                    .filter(StringUtils::hasText)
                    .distinct()
                    .forEach(diseaseName -> {
                        // 자유 입력 허용: DB에 있으면 맵핑하고, 없으면 null 상태로 이름만 저장
                        DiseaseMaster master = diseaseMasterRepository.findByDiseaseName(diseaseName).orElse(null);
                        UserChronicDisease userChronicDisease = UserChronicDisease.builder()
                                .user(user)
                                .diseaseMaster(master)
                                .diseaseName(diseaseName)
                                .build();
                        userChronicDiseaseRepository.save(userChronicDisease);
                    });
        }

        user.activateGeneralUser();
        userRepository.save(user);
    }

    // 약사 회원가입 2단계 추가 정보 등록
    @Transactional
    public void addPharmacistProfile(String email, PharmacistVerifyRequest pharmacistVerifyRequest, MultipartFile image) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        // 실제 S3에 업로드
        String imageUrl = s3Service.upload(image);

        PharmacistProfile pharmacistProfile = PharmacistProfile.builder()
                .user(user)
                .docNumber(pharmacistVerifyRequest.getDocNumber())
                .licenseNumber(pharmacistVerifyRequest.getLicenseNumber())
                .licenseImage(imageUrl)
                .build();
        pharmacistProfileRepository.save(pharmacistProfile);
        user.setWaitingForApproval();
    }

    // 로그인
    public LoginResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다");
        }

        if (user.getStatus() == UserStatus.PENDING) {
            throw new IllegalArgumentException("회원가입이 완료되지 않은 회원입니다");
        }

        // WAITING_APPROVAL 상태여도 로그인은 가능하게 수정 (마이페이지 접근 등 허용을 위함)
        if (user.getStatus() == UserStatus.WAITING_APPROVAL && user.getRole() == Role.USER) {
            throw new IllegalArgumentException("회원가입이 완료되지 않은 계정입니다");
        }

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

    // Refresh Token 재발급
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

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtProvider.createRefreshToken(user.getEmail());

        refreshTokenRepository.save(new RefreshToken(user.getEmail(), newRefreshToken, 14 * 24 * 60 * 60L));

        return new LoginResponse(user.getId(), newAccessToken, newRefreshToken, user.getEmail(), user.getRole().name(), user.getStatus());
    }

    // 로그아웃
    public void logout(String email) {
        refreshTokenRepository.deleteById(email);
    }

    //마이페이지 정보 조회
    @Transactional
    public UserProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmail(email)
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
                .status(user.getStatus()) // 상태 추가
                //일반 유저 건강,질병 정보
                .isPregnant(userProfileHealth != null ? userProfileHealth.getIsPregnant() : false)
                .isBreastfeeding(userProfileHealth != null ? userProfileHealth.getIsBreastfeeding() : false)
                .isSmoking(userProfileHealth != null ? userProfileHealth.getIsSmoking() : false)
                .isDrinking(userProfileHealth != null ? userProfileHealth.getIsDrinking() : false)
                .isChild(userProfileHealth != null ? userProfileHealth.getIsChild() : false)
                .isElderly(userProfileHealth != null ? userProfileHealth.getIsElderly() : false)
                .chronicDiseases(diseases)
                //약사 정보
                .docNumber(pharmacistProfile != null ? pharmacistProfile.getDocNumber() : null)
                .licenseNumber(pharmacistProfile != null ? pharmacistProfile.getLicenseNumber() : null)
                .licenseImage(pharmacistProfile != null && pharmacistProfile.getLicenseImage() != null 
                        ? s3Service.getPresignedUrl(pharmacistProfile.getLicenseImage()) 
                        : null)
                .build();
    }


    @Transactional
    public void updateMyProfile(String email, ProfileUpdateRequest profileUpdateRequest) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 1. 역할(Role) 업데이트 (추가)
        if (profileUpdateRequest.getRole() != null) {
            // User 엔티티에 setRole 메서드가 없다면 reflection이나 필드 직접 수정이 필요할 수 있으나, 
            // 여기서는 domain.User에 setRole 대신 updateBasicProfile 등을 확장하거나 새로 만듭니다.
            // 일단 User.java에 public void updateRole(Role role)이 있다고 가정하거나 추가해야 함.
            user.updateRole(profileUpdateRequest.getRole());
        }

        //기본정보 수정(이름, 생년월일, 성별)
        user.updateBasicProfile(
                profileUpdateRequest.getUsername(),
                profileUpdateRequest.getBirthDate(),
                profileUpdateRequest.getGender()
        );

        // 2. 일반 유저일 경우에만 건강 정보 수정
        if (user.getRole() == Role.USER) {
            UserProfileHealth userProfileHealth = userProfileHealthRepository.findByUser(user)
                    .orElseGet(() -> {
                        // 만약 신규 생성이 필요한데 필수 필드가 null이면 에러가 나므로,
                        // 요청에 건강 정보가 있을 때만 생성하도록 방어 로직 추가
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

    // 약사 정보 수정 (면허 재인증 포함)
    @Transactional
    public void updatePharmacistProfile(String email, PharmacistVerifyRequest request, MultipartFile image) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        PharmacistProfile profile = pharmacistProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("약사 프로필이 존재하지 않습니다"));

        String imageUrl = profile.getLicenseImage();
        if (image != null && !image.isEmpty()) {
            imageUrl = s3Service.upload(image);
        }

        // 1. 프로필 정보 업데이트
        profile.updateLicenseInfo(request.getDocNumber(), request.getLicenseNumber(), imageUrl);

        // 2. 관리자 재승인 상태로 변경
        user.setWaitingForApproval();
        userRepository.save(user);
    }

    //본인 계정 탈퇴 및 삭제 (일반 유저, 약사용)
    @Transactional
    public void withdraw(String email){
        User user = userRepository.findByEmail(email)
                .orElseThrow(()->new CustomException(ErrorCode.USER_NOT_FOUND));

        // 1. S3 이미지 등 외부 리소스만 수동 정리 (DB는 Cascade로 자동 삭제)
        if (user.getRole() == Role.PHARMACIST && user.getPharmacistProfile() != null){
            String imageKey = user.getPharmacistProfile().getLicenseImage();
            if(imageKey != null && !imageKey.equals("DELETED_DUE_TO_PRIVACY")){
                s3Service.deleteFile(imageKey);
            }
        }

        // 2. 리프레시 토큰 정리
        refreshTokenRepository.deleteById(email);

        // 3. 유저 삭제 (CascadeType.ALL에 의해 연관된 건강정보, 질병정보, 약사프로필 자동 삭제)
        userRepository.delete(user);
    }

    // 비밀번호 재설정 문자 발송
    public void sendPasswordResetSms(PasswordRequest.FindRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 소셜 로그인 유저 체크
        if (user.getSocialType() != null) {
            throw new CustomException(ErrorCode.IS_SOCIAL_USER);
        }

        smsService.sendSms(request.getPhoneNumber());
    }

    // 비밀번호 재설정 완료 (인증 번호 없이 간소화)
    @Transactional
    public void resetPassword(PasswordRequest.ResetRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getSocialType() != null) {
            throw new CustomException(ErrorCode.IS_SOCIAL_USER);
        }

        // 인증 번호 검증 제거
        // if (!smsService.verifySms(request.getPhoneNumber(), request.getCode())) {
        //     throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        // }

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // 로그인 상태에서 비밀번호 수정
    @Transactional
    public void updatePassword(String email, PasswordRequest.UpdateRequest request) {
        User user = userRepository.findByEmail(email)
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
