package com.ibmteam02.backend_consultation.global.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Getter
@MappedSuperclass
public abstract class BaseTimeEntity {
    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist(){
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate(){
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
