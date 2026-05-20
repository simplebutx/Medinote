package com.ibmteam02.backend_auth.global.auth.service;

import com.ibmteam02.backend_auth.global.auth.domain.RefreshToken;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.global.auth.repository.RefreshTokenRepository;
import com.ibmteam02.backend_auth.global.error.exception.CustomException;
import com.ibmteam02.backend_auth.global.error.exception.ErrorCode;
import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import com.ibmteam02.backend_auth.user.dto.*;
import com.ibmteam02.backend_auth.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    //회원가입
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


    //약사 회원가입 2단계 추가 정보 등록
    @Transactional
    public void addPharmacistProfile(String email, PharmacistVerifyRequest pharmacistVerifyRequest, MultipartFile image){
        User user = userRepository.findByEmail(email)
                .orElseThrow(()->new RuntimeException("유저 없음"));
        String imageUrl = "s3/mymedi/licenses/" + image.getOriginalFilename();
        user.addPharmacistProfile(
                pharmacistVerifyRequest.getDocNumber(),
                pharmacistVerifyRequest.getLicenseNumber(),
                imageUrl);
    }

    //로그인
    public LoginResponse login(LoginRequest loginRequest){
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(()-> new IllegalArgumentException("가입되지 않은 이메일입니다"));

        if(!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())){
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다");
        }

        if(user.getStatus() == UserStatus.PENDING){
            throw new IllegalArgumentException("회원가입 2단계가 완료되지 않은 계정입니다");
        }

        String accessToken = jwtProvider.createToken(user.getEmail(), user.getRole().name());
        String refreshTokenValue = jwtProvider.createRefreshToken(user.getEmail());

        RefreshToken refreshToken = new RefreshToken(
                user.getEmail(),
                refreshTokenValue,
                14*24*60*60L
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

        String newAccessToken = jwtProvider.createToken(user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtProvider.createRefreshToken(user.getEmail());

        refreshTokenRepository.save(new RefreshToken(user.getEmail(), newRefreshToken, 14*24*60*60L));

        return new LoginResponse(newAccessToken, newRefreshToken, user.getEmail(), user.getRole().name());
    }

    // 로그아웃
    public void logout(String email) {
        refreshTokenRepository.deleteById(email);
    }
}
