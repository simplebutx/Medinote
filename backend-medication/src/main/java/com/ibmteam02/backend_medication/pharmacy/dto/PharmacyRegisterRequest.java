package com.ibmteam02.backend_medication.pharmacy.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PharmacyRegisterRequest {
    private String address; // 상세 주소
    private String phone; //약국 전화번호
    private Double latitude; //위도
    private Double longitude; //경도
    private String pharmacyName; //약국명(회원가입 시 입력한)

    private String mondayOpen;
    private String mondayClose;
    private String tuesdayOpen;
    private String tuesdayClose;
    private String wednesdayOpen;
    private String wednesdayClose;
    private String thursdayOpen;
    private String thursdayClose;
    private String fridayOpen;
    private String fridayClose;
    private String saturdayOpen;
    private String saturdayClose;
    private String sundayOpen;
    private String sundayClose;
    private String holidayOpen;
    private String holidayClose;
}
