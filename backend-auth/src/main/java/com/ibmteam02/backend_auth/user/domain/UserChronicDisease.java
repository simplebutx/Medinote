package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

//기저질환 엔티티
@Entity
@Getter
@Table(name = "user_chronic_disease")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserChronicDisease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disease_code", referencedColumnName = "disease_code")
    private DiseaseMaster diseaseMaster;

    @Column(nullable = false)
    private String diseaseName;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public UserChronicDisease(User user,DiseaseMaster diseaseMaster,String diseaseName) {
        this.user = user;
        this.diseaseMaster = diseaseMaster;
        this.diseaseName = diseaseName;
    }
}
