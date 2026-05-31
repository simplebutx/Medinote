package com.ibmteam02.backend_medication.pharmacy.dto;

import com.ibmteam02.backend_medication.pharmacy.domain.Pharmacy;

public record PharmacyDetailResponse(
        String hpid,
        String name,
        String address,
        String phone,
        Double latitude,
        Double longitude,
        String mondayOpen,
        String mondayClose,
        String saturdayOpen,
        String saturdayClose,
        String sundayOpen,
        String sundayClose,
        String holidayOpen,
        String holidayClose,
        String description,
        String extraInfo
) {
    public static PharmacyDetailResponse from(Pharmacy pharmacy) {
        return new PharmacyDetailResponse(
                pharmacy.getHpid(),
                pharmacy.getName(),
                pharmacy.getAddress(),
                pharmacy.getPhone(),
                pharmacy.getLatitude(),
                pharmacy.getLongitude(),
                pharmacy.getMondayOpen(),
                pharmacy.getMondayClose(),
                pharmacy.getSaturdayOpen(),
                pharmacy.getSaturdayClose(),
                pharmacy.getSundayOpen(),
                pharmacy.getSundayClose(),
                pharmacy.getHolidayOpen(),
                pharmacy.getHolidayClose(),
                pharmacy.getDescription(),
                pharmacy.getExtraInfo()
        );
    }
}