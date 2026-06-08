package com.ibmteam02.backend_consultation.consultation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "consultation_session")
public class ConsultationSession {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    private Long pharmacistId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(columnDefinition = "TEXT")
    private String chatLog;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    private ConsultationSession(Long id, Long customerId, Long pharmacistId, SessionStatus status){
        this.id = id;
        this.customerId = customerId;
        this.pharmacistId = pharmacistId;
        this.status = status != null ? status : SessionStatus.PENDING;
    }

    public static ConsultationSession createSession(Long customerId){
        return ConsultationSession.builder()
                .customerId(customerId)
                .status(SessionStatus.PENDING)
                .build();
    }

    public void matchPharmacist(Long pharmacistId){
        this.pharmacistId = pharmacistId;
        this.status = SessionStatus.MATCHED;
    }

    public void closeSession(){
        this.status = SessionStatus.CLOSED;
    }

    public void updateChatLog(String chatLog){
        this.chatLog = chatLog;
    }

    public void updateConsultationSummary(String aiAnswerGuide){
        this.aiSummary = aiAnswerGuide;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
