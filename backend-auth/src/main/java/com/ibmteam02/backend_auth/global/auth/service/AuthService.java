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
                .build();

        userProfileHealthRepository.save(health);

        List<String> diseaseNames = userProfileRequest.getDiseaseNames();
        if (diseaseNames != null) {
            diseaseNames.stream()
                    .filter(StringUtils::hasText)
                    .distinct()
                    .forEach(diseaseName -> diseaseMasterRepository.findByDiseaseName(diseaseName)
                            .ifPresent(diseaseMaster -> {
                                UserChronicDisease userChronicDisease = UserChronicDisease.builder()
                                        .user(user)
                                        .diseaseMaster(diseaseMaster)
                                        .diseaseName(diseaseMaster.getDiseaseName())
                                        .build();
                                userChronicDiseaseRepository.save(userChronicDisease);
                            }));
        }

        user.activateGeneralUser();
        userRepository.save(user);
    }

    // 약사 회원가입 2단계 추가 정보 등록
    @Transactional
    public void addPharmacistProfile(String email, PharmacistVerifyRequest pharmacistVerifyRequest, MultipartFile image) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        String imageUrl = "s3/mymedi/licenses/" + image.getOriginalFilename();

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

        if (user.getStatus() == UserStatus.WAITING_APPROVAL) {
            if (user.getRole() == Role.PHARMACIST) {
                throw new IllegalArgumentException("관리자 확인 후 로그인이 가능합니다");
            }
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

        return new LoginResponse(user.getId(), accessToken, refreshTokenValue, user.getEmail(), user.getRole().name());
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

        return new LoginResponse(user.getId(), newAccessToken, newRefreshToken, user.getEmail(), user.getRole().name());
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
                .email(user.getEmail())
                .username(user.getUsername())
                .birthDate(user.getBirthDate())
                .gender(user.getGender())
                .role(user.getRole())
                //일반 유저 건강,질병 정보
                .isPregnant(userProfileHealth != null ? userProfileHealth.getIsPregnant() : false)
                .isBreastfeeding(userProfileHealth != null ? userProfileHealth.getIsBreastfeeding() : false)
                .isSmoking(userProfileHealth != null ? userProfileHealth.getIsSmoking() : false)
                .isDrinking(userProfileHealth != null ? userProfileHealth.getIsDrinking() : false)
                .chronicDiseases(diseases)
                //약사 정보
                .docNumber(pharmacistProfile != null ? pharmacistProfile.getDocNumber() : null)
                .licenseNumber(pharmacistProfile != null ? pharmacistProfile.getLicenseNumber() : null)
                .licenseImage(pharmacistProfile != null ? pharmacistProfile.getLicenseImage() : null)
                .build();
    }


    //마이페이지 정보 수정
    @Transactional
    public void updateMyProfile(String email, ProfileUpdateRequest profileUpdateRequest) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        //기본정보 수정(이름, 생년월일, 성별)
        user.updateBasicProfile(
                profileUpdateRequest.getUsername(),
                profileUpdateRequest.getBirthDate(),
                profileUpdateRequest.getGender()
        );

        //일반 유저 추가 정보 수정
        if (user.getRole() == Role.USER) {
            UserProfileHealth userProfileHealth = userProfileHealthRepository.findByUser(user)
                    .orElseGet(() -> userProfileHealthRepository.save(UserProfileHealth.builder()
                            .user(user)
                            .build()));

            userProfileHealth.updateHealth(
                    profileUpdateRequest.getIsPregnant(),
                    profileUpdateRequest.getIsBreastfeeding(),
                    profileUpdateRequest.getIsSmoking(),
                    profileUpdateRequest.getIsDrinking()
            );

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
            imageUrl = "s3/mymedi/licenses/" + image.getOriginalFilename(); // 실제 S3 연동 시 업로드 로직 필요
        }

        // 1. 프로필 정보 업데이트
        profile.updateLicenseInfo(request.getDocNumber(), request.getLicenseNumber(), imageUrl);

        // 2. 관리자 재승인 상태로 변경
        user.setWaitingForApproval();
        userRepository.save(user);
    }

}
