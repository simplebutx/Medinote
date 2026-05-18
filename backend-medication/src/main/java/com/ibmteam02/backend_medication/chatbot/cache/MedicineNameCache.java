package com.ibmteam02.backend_medication.chatbot.cache;

import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MedicineNameCache {
    private final MedicineInfoRepository medicineInfoRepository;

    private List<String> medicineNames = List.of();

    @PostConstruct  // 서버 시작시 최초 1회만 실행
    public void init() {
        medicineNames = medicineInfoRepository.findAllItemNames();
    }

    public List<String> getMedicineNames() {
        return medicineNames;
    }
}
