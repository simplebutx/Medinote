package com.ibmteam02.backend_medication.pharmacy.controller;

import com.ibmteam02.backend_medication.global.auth.JwtProvider;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyDetailResponse;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyMapResponse;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyRegisterRequest;
import com.ibmteam02.backend_medication.pharmacy.service.PharmacyInventoryService;
import com.ibmteam02.backend_medication.pharmacy.service.PharmacyService;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pharmacies")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyService pharmacyService;
    private final PharmacyInventoryService pharmacyInventoryService;
    private final JwtProvider jwtProvider;

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

    // 약국 상세정보 조회
    @GetMapping("/{hpid}")
    public PharmacyDetailResponse getPharmacyDetail(@PathVariable String hpid) {
        return pharmacyService.getPharmacyDetail(hpid);
    }

    //약사가 약국 직접 수동 등록
    @PostMapping
    public ResponseEntity<String> registerPharmacy(
            @RequestHeader("Authorization") String token,
            @RequestBody PharmacyRegisterRequest pharmacyRegisterRequest) {

        Long pharmacistId = jwtProvider.getUserIdFromToken(token.substring(7));
        String hpid = pharmacyService.registerPharmacy(pharmacistId, pharmacyRegisterRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(hpid);
    }

    //약사가 수동 등록한 약국 정보 수정
    @PatchMapping("/{hpid}")
    public ResponseEntity<Void> updatePharmacy(
            @RequestHeader("Authorization") String token,
            @PathVariable String hpid,
            @RequestBody PharmacyRegisterRequest pharmacyRegisterRequest) {

        Long pharmacistId = jwtProvider.getUserIdFromToken(token.substring(7));
        pharmacyService.updatePharmacy(pharmacistId, hpid, pharmacyRegisterRequest);
        return ResponseEntity.noContent().build();
    }

    //일반 유저 약 검색 기반 약국 조회
    @GetMapping("/search/medicine")
    public ResponseEntity<List<PharmacyMapResponse>> searchByMedicine(
            @RequestParam String itemName,
            @RequestParam double southLat,
            @RequestParam double northLat,
            @RequestParam double westLng,
            @RequestParam double eastLng
    ){
        List<PharmacyMapResponse> results = pharmacyService.searchPharmaciesByMedicine(
                itemName, southLat, northLat, westLng, eastLng
        );
        return ResponseEntity.ok(results);
    }


}
