package com.ibmteam02.backend_medication.notification.domain;

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
@Table(name = "medication_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationNotification {

    private static final ZoneId NOTIFICATION_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "medication_schedule_id", nullable = false)
    private Long medicationScheduleId;

    @Column(name = "medication_schedule_medicine_id", nullable = false)
    private Long medicationScheduleMedicineId;

    @Column(name = "medication_schedule_time_id", nullable = false)
    private Long medicationScheduleTimeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private NotificationStatus status;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "is_visible", nullable = false)
    private Boolean visible;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public MedicationNotification(
            Long userId,
            Long medicationScheduleId,
            Long medicationScheduleMedicineId,
            Long medicationScheduleTimeId,
            NotificationType type,
            String title,
            String body,
            LocalDateTime scheduledAt
    ) {
        this.userId = userId;
        this.medicationScheduleId = medicationScheduleId;
        this.medicationScheduleMedicineId = medicationScheduleMedicineId;
        this.medicationScheduleTimeId = medicationScheduleTimeId;
        this.type = type;
        this.status = NotificationStatus.PENDING;
        this.title = title;
        this.body = body;
        this.scheduledAt = scheduledAt;
        this.visible = Boolean.TRUE;
    }

    public void markSent() {
        this.status = NotificationStatus.SENT;
        this.sentAt = LocalDateTime.now(NOTIFICATION_ZONE);
        this.failureReason = null;
        this.visible = Boolean.TRUE;
    }

    public void markFailed(String reason) {
        this.status = NotificationStatus.FAILED;
        this.failureReason = reason;
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
