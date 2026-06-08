package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
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
@Table(name = "user_profile_health")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfileHealth {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private Boolean isPregnant = false;

    @Column(nullable = false)
    private Boolean isBreastfeeding = false;

    @Column(nullable = false)
    private Boolean isSmoking = false;

    @Column(nullable = false)
    private Boolean isDrinking = false;

    @Column(nullable = false)
    private Boolean isChild = false;

    @Column(nullable = false)
    private Boolean isElderly = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public UserProfileHealth(User user, Boolean isPregnant, Boolean isBreastfeeding, Boolean isSmoking, Boolean isDrinking, Boolean isChild, Boolean isElderly){
        this.user = user;
        this.isPregnant = isPregnant;
        this.isBreastfeeding = isBreastfeeding;
        this.isSmoking = isSmoking;
        this.isDrinking = isDrinking;
        this.isChild = isChild;
        this.isElderly = isElderly;
    }

    public void updateHealth(Boolean isPregnant, Boolean isBreastfeeding, Boolean isSmoking, Boolean isDrinking, Boolean isChild, Boolean isElderly){
        this.isPregnant = isPregnant;
        this.isBreastfeeding = isBreastfeeding;
        this.isSmoking = isSmoking;
        this.isDrinking = isDrinking;
        this.isChild = isChild;
        this.isElderly = isElderly;
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
