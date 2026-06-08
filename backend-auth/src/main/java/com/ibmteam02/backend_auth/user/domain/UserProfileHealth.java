package com.ibmteam02.backend_auth.user.domain;

import com.ibmteam02.backend_auth.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Table(name = "user_profile_health")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfileHealth extends BaseTimeEntity {
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

    @Column(nullable = false)
    private Boolean isChild = false; // 소아 여부

    @Column(nullable = false)
    private Boolean isElderly = false; // 고령 여부

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


}
