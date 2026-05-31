package com.ibmteam02.backend_consultation.consultation.domain;

public enum SessionStatus {
    PENDING, // 약사 매칭 대기중
    MATCHED, // 약사 매칭 완료
    CLOSED // 상담 종료
}
