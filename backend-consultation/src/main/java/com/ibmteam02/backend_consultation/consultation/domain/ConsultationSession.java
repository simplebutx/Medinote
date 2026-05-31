package com.ibmteam02.backend_consultation.consultation.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "consultation_session") //약사 상담 대화방
public class ConsultationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; //방 번호

    @Column(nullable = false)
    private Long customerId; // 방 주인 (일반 유저)

    private Long pharmacistId; //약사 유저

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    private ConsultationSession(Long id, Long customerId, Long pharmacistId, SessionStatus status,LocalDateTime createdAt,LocalDateTime updatedAt){
        this.id = id;
        this.customerId = customerId;
        this.pharmacistId = pharmacistId;
        this.status = status != null ? status : SessionStatus.PENDING; //약사 매칭 전 상태값
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // 대화방 session 생성
    public static ConsultationSession createSession(Long customerId){
        return ConsultationSession.builder()
                .customerId(customerId)
                .status(SessionStatus.PENDING)
                .build();
    }

    //약사 대화방 매칭
    public void matchPharmacist(Long pharmacistId){
        this.pharmacistId = pharmacistId;
        this.status = SessionStatus.MATCHED;
    }

    //상담 종료
    public void closeSession(){
        this.status = SessionStatus.CLOSED;
    }

}
