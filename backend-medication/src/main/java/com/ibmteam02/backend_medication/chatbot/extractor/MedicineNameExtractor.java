package com.ibmteam02.backend_medication.chatbot.extractor;

import com.ibmteam02.backend_medication.chatbot.cache.MedicineNameCache;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MedicineNameExtractor {

    private final MedicineNameCache medicineNameCache;

    // 약 이름 추출
    public List<String> extract(String message) {
        if(message == null || message.isBlank()) {
            return List.of();
        }

        return medicineNameCache.getMedicineNames().stream()
                .filter(name -> name != null && !name.isBlank())  // db약 빈값 제거
                .sorted((a, b) -> Integer.compare(b.length(), a.length()))  // db약 긴 이름부터 정렬
                .filter(name -> message.contains(name))   // db약이 메세지 안에 있는지 검사
                .distinct()  // 중복 제거
                .toList();
    }
}
