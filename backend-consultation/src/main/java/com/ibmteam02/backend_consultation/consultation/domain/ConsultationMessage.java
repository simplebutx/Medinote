package com.ibmteam02.backend_consultation.consultation.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "consultation_messages")
public class ConsultationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConsultationSession session; // 소속된 대화방 ID (일반 유저)

    @Column(nullable = false)
    private Long senderId; // 보낸 사람의 고유 PK ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SenderType senderType; // 보낸 사람 role (USER,PHARMACIST)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // 메세지 내용

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private ConsultationMessage(ConsultationSession session, Long senderId, SenderType senderType, String content){
        this.session = session;
        this.senderId = senderId;
        this.senderType = senderType;
        this.content = content;

    }

    //메세지 생성
    public static ConsultationMessage createMessage(ConsultationSession session, Long senderId, SenderType senderType, String content) {
        return ConsultationMessage.builder()
                .session(session)
                .senderId(senderId)
                .senderType(senderType)
                .content(content)
                .build();
    }
}
