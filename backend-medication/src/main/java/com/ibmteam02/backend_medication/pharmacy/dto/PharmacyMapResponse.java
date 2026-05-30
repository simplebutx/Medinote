package com.ibmteam02.backend_medication.pharmacy.dto;

import com.ibmteam02.backend_medication.pharmacy.domain.Pharmacy;

public record PharmacyMapResponse(
        String hpid,
        String name,
        String address,
        String phone,
        String postalCode,
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
        String extraInfo,
        String mapImageUrl,
        String homepageUrl
) {

    public static PharmacyMapResponse from(Pharmacy pharmacy) {
        return new PharmacyMapResponse(
                pharmacy.getHpid(),
                pharmacy.getName(),
                pharmacy.getAddress(),
                pharmacy.getPhone(),
                pharmacy.getPostalCode(),
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
                pharmacy.getExtraInfo(),
                pharmacy.getMapImageUrl(),
                pharmacy.getHomepageUrl()
        );
    }
}
