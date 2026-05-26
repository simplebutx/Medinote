package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "user_profile_health")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfileHealth {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private Boolean isPregnant = false; // 임산부

    @Column(nullable = false)
    private Boolean isBreastfeeding = false; //모유수유 여부

    @Column(nullable = false)
    private Boolean isSmoking = false; //흡연 여부

    @Column(nullable = false)
    private Boolean isDrinking = false; //음주 여부

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public UserProfileHealth(User user, Boolean isPregnant, Boolean isBreastfeeding, Boolean isSmoking, Boolean isDrinking){
        this.user = user;
        this.isPregnant = isPregnant;
        this.isBreastfeeding = isBreastfeeding;
        this.isSmoking = isSmoking;
        this.isDrinking = isDrinking;
    }

    public void updateHealth(Boolean isPregnant, Boolean isBreastfeeding, Boolean isSmoking, Boolean isDrinking){
        this.isPregnant = isPregnant;
        this.isBreastfeeding = isBreastfeeding;
        this.isSmoking = isSmoking;
        this.isDrinking = isDrinking;
    }


}
