package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.dto.MedicineSearchResponse;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MedicineSearchService {

    private final MedicineInfoRepository medicineInfoRepository;

    // 약이름 자동완성
    public List<String> suggestMedicine(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        return medicineInfoRepository.findTop10ByItemNameContaining(keyword).stream()
                .map(MedicineInfo::getItemName)
                .distinct()
                .toList();
    }

    // 약 검색 결과
    public MedicineSearchResponse searchMedicine(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("keyword is blank");
        }

        MedicineInfo medicine = medicineInfoRepository.findByItemName(keyword)
                .orElseThrow(() -> new IllegalArgumentException("medicine not found"));

        return new MedicineSearchResponse(
                medicine.getItemSeq(),
                medicine.getItemName(),
                medicine.getCompanyName(),
                medicine.getEfficacy(),
                medicine.getUseMethod(),
                medicine.getCaution(),
                medicine.getSideEffect(),
                medicine.getImageUrl()
        );
    }
}
