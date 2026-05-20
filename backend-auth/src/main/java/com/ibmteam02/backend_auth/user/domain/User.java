package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true,nullable = false)
    private String email; // 이메일

    @Column(nullable = false)
    private String password; //패스워드

    @Column(nullable = false)
    private String username; //사용자 닉네임

    @Column(nullable = false)
    private LocalDate birthDate; //생년월일

    @Enumerated(EnumType.STRING)
    private Gender gender; // MALE, FEMALE

    @Enumerated(EnumType.STRING)
    private Role role; //USER, PHARMACIST, ADMIN

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Builder
    public User(String email,String password, String username, LocalDate birthDate, Gender gender,Role role ){
        this.email = email;
        this.password = password;
        this.username = username;
        this.birthDate = birthDate;
        this.gender = gender;
        this.role = role;
        this.status = UserStatus.PENDING;
    }

    //일반 유저 추가 정보
    private String allergies;
    private String diseases;

    //약사 추가 정보
    private String docNumber;
    private String licenseNumber;
    private String licenseImage;

    //일반 유저 추가 정보 (회원가입 2단계)
    public void addUserProfile(String allergies, String diseases){
        this.allergies = allergies;
        this.diseases = diseases;
        this.status = UserStatus.ACTIVE;
    }

    //약사 추가 정보(회원가입 2단계)
    public void addPharmacistProfile(String docNumber, String licenseNumber, String licenseImage){
        this.docNumber = docNumber;
        this.licenseNumber = licenseNumber;
        this.licenseImage = licenseImage;
        this.status = UserStatus.ACTIVE;
    }
}
