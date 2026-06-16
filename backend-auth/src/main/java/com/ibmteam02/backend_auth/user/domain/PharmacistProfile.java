package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Entity
@Table(name = "pharmacist_profile")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class PharmacistProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String docNumber;

    @Column(nullable = false)
    private String licenseNumber;

    @Column(nullable = false)
    private String licenseImage;

    @Builder
    public PharmacistProfile(User user, String docNumber, String licenseNumber, String licenseImage) {
        this.user = user;
        this.docNumber = docNumber; //약국명
        this.licenseNumber = licenseNumber; //면허번호
        this.licenseImage = licenseImage; //면허증 이미지
    }

    //약사 마이페이지 약국명 수정
    public void updatePharmacistInfo(String docNumber) {
        if (docNumber != null && !docNumber.trim().isEmpty()) {
            this.docNumber = docNumber;
        }
    }

    // 면허 정보 전체 수정 (재인증용)
    public void updateLicenseInfo(String docNumber, String licenseNumber, String licenseImage) {
        this.docNumber = docNumber;
        this.licenseNumber = licenseNumber;
        if (licenseImage != null) {
            this.licenseImage = licenseImage;
        }
    }

    public void clearLicenseImage(){
        this.licenseImage = "DELETED_DUE_TO_PRIVACY";
    }
}
