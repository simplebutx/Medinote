package com.ibmteam02.backend_consultation.consultation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
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
@Table(name = "consultation_messages")
public class ConsultationMessage {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConsultationSession session;

    @Column(nullable = false)
    private Long senderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SenderType senderType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private ConsultationMessage(ConsultationSession session, Long senderId, SenderType senderType, String content){
        this.session = session;
        this.senderId = senderId;
        this.senderType = senderType;
        this.content = content;
    }

    public static ConsultationMessage createMessage(ConsultationSession session, Long senderId, SenderType senderType, String content) {
        return ConsultationMessage.builder()
                .session(session)
                .senderId(senderId)
                .senderType(senderType)
                .content(content)
                .build();
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
