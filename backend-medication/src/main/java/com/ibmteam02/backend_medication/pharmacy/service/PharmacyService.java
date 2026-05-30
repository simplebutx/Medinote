package com.ibmteam02.backend_medication.pharmacy.service;

import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyMapResponse;
import com.ibmteam02.backend_medication.pharmacy.repository.PharmacyRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PharmacyService {

    private static final int DEFAULT_MAX_RESULTS = 300;

    private final PharmacyRepository pharmacyRepository;

    // 현재 지도 범위 내에 약국 표시
    public List<PharmacyMapResponse> getPharmaciesInBounds(
            double southLat,
            double northLat,
            double westLng,
            double eastLng,
            Integer limit
    ) {
        int size = Math.max(1, Math.min(limit == null ? DEFAULT_MAX_RESULTS : limit, DEFAULT_MAX_RESULTS));

        return pharmacyRepository.findInBounds(
                        Math.min(southLat, northLat),
                        Math.max(southLat, northLat),
                        Math.min(westLng, eastLng),
                        Math.max(westLng, eastLng),
                        PageRequest.of(0, size)
                ).stream()
                .map(PharmacyMapResponse::from)
                .toList();
    }
}
