package com.ibmteam02.backend_medication.smartpill.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "smart_pill_device",
        uniqueConstraints = @UniqueConstraint(name = "uk_smart_pill_device_device_id", columnNames = "device_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmartPillDevice {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false, length = 120)
    private String deviceId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "active_detection", nullable = false)
    private Boolean activeDetection;

    @Column(name = "detection_started_at")
    private LocalDateTime detectionStartedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public SmartPillDevice(String deviceId, Long userId, String name) {
        this.deviceId = deviceId;
        this.userId = userId;
        this.name = name;
        this.activeDetection = false;
    }

    public void updateName(String name) {
        if (name != null && !name.isBlank()) {
            this.name = name;
        }
    }

    public void pauseDetection() {
        this.activeDetection = false;
    }

    public void startDetection() {
        this.activeDetection = true;
        this.detectionStartedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }

    public boolean isDetectionActive() {
        return Boolean.TRUE.equals(activeDetection);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        if (this.activeDetection == null) {
            this.activeDetection = false;
        }
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
