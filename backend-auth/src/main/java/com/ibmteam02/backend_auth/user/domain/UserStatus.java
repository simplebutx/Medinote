package com.mymedi.backend.user.domain;

public enum UserStatus {
    PENDING, // 가입 직후 (추가 정보 입력 전)
    ACTIVE // 추가 정보 입력 및 인증 완료 상태
}
