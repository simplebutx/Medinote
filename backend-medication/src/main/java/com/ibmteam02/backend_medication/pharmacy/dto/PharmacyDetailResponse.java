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
        String tuesdayOpen,
        String tuesdayClose,
        String wednesdayOpen,
        String wednesdayClose,
        String thursdayOpen,
        String thursdayClose,
        String fridayOpen,
        String fridayClose,
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
                pharmacy.getTuesdayOpen(),
                pharmacy.getTuesdayClose(),
                pharmacy.getWednesdayOpen(),
                pharmacy.getWednesdayClose(),
                pharmacy.getThursdayOpen(),
                pharmacy.getThursdayClose(),
                pharmacy.getFridayOpen(),
                pharmacy.getFridayClose(),
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
