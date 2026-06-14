package com.ibmteam02.backend_auth.global.error.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ErrorCode {
    //회원가입 유저 인증 관련
    DUPLICATE_EMAIL(400,"U001","이미 존재하는 이메일입니다"),
    USER_NOT_FOUND(404,"U002","존재하지 않는 유저입니다"),
    //토큰 관련 오류
    INVALID_REFRESH_TOKEN(401,"T001","유효하지 않은 리프레시 토큰입니다"),
    EXPIRED_REFRESH_TOKEN(401,"T002","만료된 리프레시 토큰입니다. 다시 로그인해주세요"),
    REFRESH_TOKEN_NOT_FOUND(404,"T003","리프레시 토큰을 찾을 수 없습니다"),

    INVALID_BIRTH_DATE(400, "U003", "생년월일 형식이 올바르지 않습니다"),
    SIGNUP_FAILED(500, "U004", "회원가입 처리 중 오류가 발생했습니다"),
    IS_SOCIAL_USER(400, "U005", "소셜 로그인으로 가입된 계정입니다. 해당 소셜 로그인을 이용해주세요."),
    INVALID_PASSWORD(400, "U006", "비밀번호가 일치하지 않습니다."),
    INVALID_VERIFICATION_CODE(400, "U007", "인증 번호가 일치하지 않거나 만료되었습니다.");

    private final int status;
    private final String code;
    private final String message;
}
