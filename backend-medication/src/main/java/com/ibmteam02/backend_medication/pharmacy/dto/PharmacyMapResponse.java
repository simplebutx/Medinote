package com.ibmteam02.backend_medication.pharmacy.dto;

import com.ibmteam02.backend_medication.pharmacy.domain.Pharmacy;

public record PharmacyMapResponse(
        String hpid,
        String name,
        String address,
        String phone,
        Double latitude,
        Double longitude
) {
    public static PharmacyMapResponse from(Pharmacy pharmacy) {
        return new PharmacyMapResponse(
                pharmacy.getHpid(),
                pharmacy.getName(),
                pharmacy.getAddress(),
                pharmacy.getPhone(),
                pharmacy.getLatitude(),
                pharmacy.getLongitude()
        );
    }
}