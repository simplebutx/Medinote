package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column
    private String password; // 소셜 로그인 시 null 가능

    @Enumerated(EnumType.STRING)
    private SocialType socialType; // KAKAO, GOOGLE, NAVER

    private String socialId; // 소셜 서버의 고유 ID

    @Column(nullable = false)
    private String username;

    @Column
    private LocalDate birthDate; //생년월일

    @Enumerated(EnumType.STRING)
    private Gender gender; // MALE, FEMALE

    @Enumerated(EnumType.STRING)
    private Role role; //USER, PHARMACIST, ADMIN

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private UserStatus status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String password, SocialType socialType, String socialId, String username, LocalDate birthDate, Gender gender, Role role) {
        this.email = email;
        this.password = password;
        this.socialId = socialId;
        this.socialType = socialType;
        this.username = username;
        this.birthDate = birthDate;
        this.gender = gender;
        this.role = role;
        this.status = UserStatus.PENDING; //1단계 공통 가입 시 PENDING
    }

    //일반 유저 ACTIVE 상태 변경
    public void activateGeneralUser() {
        this.status = UserStatus.ACTIVE;
    }

    //약사 2단계 완료 시 승인 대기 상태로 변경
    public void setWaitingForApproval() {
        this.status = UserStatus.WAITING_APPROVAL;
    }

    //역사 승인 거절 시 REJECTED 상태로 변경
    public void rejectPharmacist(){
        this.status = UserStatus.REJECTED;
    }

    //역할 업데이트
    public void updateRole(Role role) {
        this.role = role;
    }

    //기본 정보 수정
    public void updateBasicProfile(String username,LocalDate birthDate, Gender gender) {
        if (username != null && username.trim().isEmpty()) {
            this.username = username;
        }
        if (birthDate != null) {
            this.birthDate = birthDate;
        }
        if (gender != null) {
            this.gender = gender;
        }
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
