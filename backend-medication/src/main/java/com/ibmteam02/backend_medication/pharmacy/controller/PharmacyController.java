package com.ibmteam02.backend_medication.pharmacy.controller;

import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyMapResponse;
import com.ibmteam02.backend_medication.pharmacy.service.PharmacyService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pharmacies")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyService pharmacyService;

    // 현재 지도 범위 내에 약국 표시
    @GetMapping
    public List<PharmacyMapResponse> getPharmaciesInBounds(
            @RequestParam double southLat,
            @RequestParam double northLat,
            @RequestParam double westLng,
            @RequestParam double eastLng,
            @RequestParam(required = false) Integer limit
    ) {
        return pharmacyService.getPharmaciesInBounds(southLat, northLat, westLng, eastLng, limit);
    }
}
