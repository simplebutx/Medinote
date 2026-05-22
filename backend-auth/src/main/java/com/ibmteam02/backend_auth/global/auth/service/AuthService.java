package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.domain.RefreshToken;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.repository.RefreshTokenRepository;
import com.ibmteam02.backend_auth.global.error.exception.CustomException;
import com.ibmteam02.backend_auth.global.error.exception.ErrorCode;
import com.ibmteam02.backend_auth.user.domain.*;
import com.ibmteam02.backend_auth.user.dto.*;
import com.ibmteam02.backend_auth.user.repository.DiseaseMasterRepository;
import com.ibmteam02.backend_auth.user.repository.UserChronicDiseaseRepository;
import com.ibmteam02.backend_auth.user.repository.UserProfileHealthRepository;
import com.ibmteam02.backend_auth.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
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


    //회원가입
    public void signup(SignupRequest signupRequest, MultipartFile licenseImage) {

        //공통 회원가입 정보 저장
        String encodedPassword = passwordEncoder.encode(signupRequest.getPassword());

        User user = User.builder()
                .email(signupRequest.getEmail())
                .password(encodedPassword)
                .username(signupRequest.getUsername())
                .birthDate(signupRequest.getBirthDate())
                .gender(signupRequest.getGender())
                .role(signupRequest.getRole())
                .build();

        if (signupRequest.getRole() == Role.USER) {
            user.activate(); //일반 유저는 바로 ACTIVE로 변경
            userRepository.save(user);

            //일반 유저 건강 상태 저장
            UserProfileHealth userProfileHealth = UserProfileHealth.builder()
                    .user(user)
                    .isPregnant(Boolean.TRUE.equals(signupRequest.getIsPregnant()))
                    .isBreastfeeding(Boolean.TRUE.equals(signupRequest.getIsBreastfeeding()))
                    .isSmoking(Boolean.TRUE.equals(signupRequest.getIsSmoking()))
                    .isDrinking(Boolean.TRUE.equals(signupRequest.getIsDrinking()))
                    .build();
            userProfileHealthRepository.save(userProfileHealth);

            //일반 유저 기저질환 저장
            if (StringUtils.hasText(signupRequest.getDiseaseName())) {
                diseaseMasterRepository.findByDiseaseName(signupRequest.getDiseaseName())
                        .ifPresent(diseaseMaster -> userChronicDiseaseRepository.save(
                                new UserChronicDisease(user, diseaseMaster, diseaseMaster.getDiseaseName())));
            }
        } else if (signupRequest.getRole() == Role.PHARMACIST) {
            String imageUrl = "s3/mymedi/licenses/" + licenseImage.getOriginalFilename();
            user.addPharmacistProfile(
                    signupRequest.getDocNumber(),
                    signupRequest.getLicenseNumber(),
                    imageUrl);

        }

        userRepository.save(user);
    }

    //로그인
    public LoginResponse login(LoginRequest loginRequest){
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(()-> new IllegalArgumentException("가입되지 않은 이메일입니다"));

        if(!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())){
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다");
        }

        if(user.getStatus() == UserStatus.WAITING_APPROVAL){
            if(user.getRole() == Role.PHARMACIST){
                throw new IllegalArgumentException("관리자 승인 후 로그인 가능합니다");
            }
            throw new IllegalArgumentException("회원가입 완료되지 않은 계정입니다");
        }

        String accessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshTokenValue = jwtProvider.createRefreshToken(user.getEmail());

        RefreshToken refreshToken = new RefreshToken(
                user.getEmail(), //key 값
                refreshTokenValue, // value 토큰값
                14*24*60*60L //14일 동안 유지 후 자동 삭제
        );

        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(accessToken, refreshTokenValue, user.getEmail(), user.getRole().name());
    }

    //Refresh Token, redis 대조
    public  LoginResponse reissue(String refreshToken){
        //토큰 검증
        if(!jwtProvider.validateToken(refreshToken)){
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        //페이로드에서 이메일 추출
        String email = jwtProvider.getEmailFromToken(refreshToken);

        //Redis 조회
        RefreshToken savedToken = refreshTokenRepository.findById(email)
                .orElseThrow(()->new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        //대조 및 새 토큰 발급
        if(!savedToken.getRefreshToken().equals(refreshToken)){
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        //새 토큰 발급
        User user = userRepository.findByEmail(email)
                .orElseThrow(()->new CustomException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtProvider.createRefreshToken(user.getEmail());

        refreshTokenRepository.save(new RefreshToken(user.getEmail(), newRefreshToken, 14*24*60*60L));

        return new LoginResponse(newAccessToken, newRefreshToken, user.getEmail(), user.getRole().name());
    }

    // 로그아웃
    public void logout(String email) {
        refreshTokenRepository.deleteById(email);
    }
}
