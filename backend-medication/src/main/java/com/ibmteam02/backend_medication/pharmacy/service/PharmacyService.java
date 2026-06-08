package com.ibmteam02.backend_medication.pharmacy.service;

import com.ibmteam02.backend_medication.pharmacy.domain.Pharmacy;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyDetailResponse;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyMapResponse;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyRegisterRequest;
import com.ibmteam02.backend_medication.pharmacy.repository.PharmacyRepository;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // 약국 상세정보 조회
    public PharmacyDetailResponse getPharmacyDetail(String hpid) {
        return pharmacyRepository.findByHpid(hpid)
                .map(PharmacyDetailResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("pharmacy not found"));
    }

    //약사가 약국 직접 수동 등록
    @Transactional
    public String registerPharmacy(Long pharmacistId, PharmacyRegisterRequest pharmacyRegisterRequest) {
        String hpid = "MOCK_" + pharmacistId;

        //약사 1명당 1개의 약국만 등록
        if (pharmacyRepository.findByHpid(hpid).isPresent()) {
            throw new IllegalStateException("이미 등록된 약국이 있습니다.");
        }

        Pharmacy pharmacy = Pharmacy.builder()
                .hpid(hpid)
                .pharmacistId(pharmacistId)
                .name(pharmacyRegisterRequest.getPharmacyName())
                .address(pharmacyRegisterRequest.getAddress())
                .phone(pharmacyRegisterRequest.getPhone())
                .latitude(pharmacyRegisterRequest.getLatitude())
                .longitude(pharmacyRegisterRequest.getLongitude())
                .mondayOpen(pharmacyRegisterRequest.getMondayOpen())
                .mondayClose(pharmacyRegisterRequest.getMondayClose())
                .tuesdayOpen(pharmacyRegisterRequest.getTuesdayOpen())
                .tuesdayClose(pharmacyRegisterRequest.getTuesdayClose())
                .wednesdayOpen(pharmacyRegisterRequest.getWednesdayOpen())
                .wednesdayClose(pharmacyRegisterRequest.getWednesdayClose())
                .thursdayOpen(pharmacyRegisterRequest.getThursdayOpen())
                .thursdayClose(pharmacyRegisterRequest.getThursdayClose())
                .fridayOpen(pharmacyRegisterRequest.getFridayOpen())
                .fridayClose(pharmacyRegisterRequest.getFridayClose())
                .saturdayOpen(pharmacyRegisterRequest.getSaturdayOpen())
                .saturdayClose(pharmacyRegisterRequest.getSaturdayClose())
                .sundayOpen(pharmacyRegisterRequest.getSundayOpen())
                .sundayClose(pharmacyRegisterRequest.getSundayClose())
                .holidayOpen(pharmacyRegisterRequest.getHolidayOpen())
                .holidayClose(pharmacyRegisterRequest.getHolidayClose())
                .build();

        return pharmacyRepository.save(pharmacy).getHpid();
    }

    //약사가 수동 등록한 약국 정보 수정
    @Transactional
    public void updatePharmacy(Long pharmacistId, String hpid, PharmacyRegisterRequest pharmacyRegisterRequest) {
        Pharmacy pharmacy = pharmacyRepository.findByHpid(hpid)
                .orElseThrow(() -> new IllegalArgumentException("약국 정보를 찾을 수 없습니다"));

        if (!pharmacy.getPharmacistId().equals(pharmacistId)) {
            throw new IllegalStateException("수정 권한이 없습니다.");
        }

        pharmacy.updatePharmacy(pharmacyRegisterRequest);

    }

    //일반 유저 약 재고 검색
    @Transactional(readOnly = true)
    public List<PharmacyMapResponse> searchPharmaciesByMedicine(
            String itemName, double southLat, double northLat, double westLng, double eastLng
    ) {
        List<Pharmacy> pharmacies = pharmacyRepository.findByMedicineStockInBounds(
                itemName, southLat, northLat, westLng, eastLng
        );

        return pharmacies.stream()
                .map(PharmacyMapResponse::from)
                .toList();
    }

}
