package com.ibmteam02.backend_auth.user.domain;

public enum UserStatus {
    WAITING_APPROVAL, // 약사 승인 전 상태
    ACTIVE // 일반 유저 회원가입 상태, 약사 승인 후 상태
}
