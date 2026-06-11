package com.ibmteam02.backend_consultation.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "consultation_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConsultationNotification {

    private static final ZoneId NOTIFICATION_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "consultation_session_id", nullable = false)
    private Long consultationSessionId;

    @Column(name = "consultation_message_id", nullable = false)
    private Long consultationMessageId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "is_visible", nullable = false)
    private Boolean visible;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public ConsultationNotification(
            Long receiverId,
            Long senderId,
            Long consultationSessionId,
            Long consultationMessageId,
            String title,
            String body
    ) {
        this.receiverId = receiverId;
        this.senderId = senderId;
        this.consultationSessionId = consultationSessionId;
        this.consultationMessageId = consultationMessageId;
        this.title = title;
        this.body = body;
        this.visible = Boolean.TRUE;
    }

    public void markRead() {
        if (this.readAt == null) {
            this.readAt = LocalDateTime.now(NOTIFICATION_ZONE);
        }
    }

    public void hide() {
        this.visible = Boolean.FALSE;
    }

    @PrePersist
    void onCreate() {
        if (this.visible == null) {
            this.visible = Boolean.TRUE;
        }

        LocalDateTime now = LocalDateTime.now(NOTIFICATION_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(NOTIFICATION_ZONE);
    }
}
