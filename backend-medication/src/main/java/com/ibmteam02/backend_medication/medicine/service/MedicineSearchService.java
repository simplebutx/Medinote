package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicineSearchService {

    private final MedicineInfoRepository medicineInfoRepository;

    // @로 약이름 선택
    public List<String> suggestMedicine(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        return medicineInfoRepository.findTop10ByItemNameContaining(keyword).stream()
                .map(MedicineInfo::getItemName)
                .distinct()
                .toList();
    }
}
