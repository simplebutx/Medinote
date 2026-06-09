package com.ibmteam02.backend_medication.medicine.controller;

import com.ibmteam02.backend_medication.medicine.dto.MedicineSearchResponse;
import com.ibmteam02.backend_medication.medicine.service.MedicineInfoService;
import com.ibmteam02.backend_medication.medicine.service.MedicineSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineInfoController {

    private final MedicineInfoService medicineInfoService;
    private final MedicineSearchService medicineSearchService;

    // 동기화 상태
    @GetMapping("/sync-status")
    public MedicineInfoService.SyncStatus getSyncStatus() {
        return medicineInfoService.getSyncStatus();
    }

    // 공공데이터 동기화
    @PostMapping("/sync")
    public MedicineInfoService.SyncResult syncMedicines() {
        return medicineInfoService.syncMedicines();
    }
    // 리턴값: 검사한 약 개수, 새로 추가한 약 개수, 업데이트한 약 개수, 성분 동기화한 약 개수, 새로저장한 성분 개수,
    // 요청한 날짜 개수, 동기화 종료 후 내 DB에서 가장최신 updateDe, 공공데이터쪽 최신 updateDe

    // 약 자동완성
    @PostMapping("/suggest")
    public List<String> suggestMedicine(@RequestParam String keyword) {
        return medicineSearchService.suggestMedicine(keyword);
    }

    // 약 검색
    @GetMapping("/search")
    public MedicineSearchResponse searchMedicine(@AuthenticationPrincipal Long userId, @RequestParam String keyword) {
        return medicineSearchService.searchMedicine(userId, keyword);
    }
}
