package com.ibmteam02.backend_consultation.chatbot.extractor;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class RequestDetailExtractor {

    private static final Map<String, List<String>> MEDICINE_INFO_DETAILS = Map.of(
            "EFFICACY", List.of("효능", "효과", "어디에 좋아", "어떤 증상", "듣는"),
            "INGREDIENT", List.of("성분", "주성분", "재료", "ingredient"),
            "STORAGE_METHOD", List.of("보관", "보관법", "실온", "냉장"),
            "CAUTION_WARNING", List.of("주의", "주의사항", "경고", "조심", "위험"),
            "USE_METHOD", List.of(
                    "먹는법", "먹는 방법", "복용", "복용법", "복용량",
                    "식전", "식후", "공복", "하루 몇 번", "하루몇번",
                    "몇번 먹어", "언제 먹어", "간격"
            )
    );

    private static final Map<String, List<String>> MY_MEDICATION_DETAILS = Map.of(
            "MEDICATION_RECORD", List.of("복용 기록", "기록", "먹었", "체크", "복용 현황"),
            "MEDICATION_SCHEDULE", List.of("복약 일정", "일정", "다음 복용", "알림", "시간", "언제"),
            "CURRENT_MEDICATION", List.of("지금 먹는 약", "현재 복용", "먹는 약", "남아있어")
    );

    private static final Map<String, List<String>> SAFETY_CONTRAINDICATION_DETAILS = Map.of(
            "CONTRAINDICATION_MATCH", List.of(
                    "알레르기", "금기", "피해야", "먹으면 안되는 성분", "위험 성분", "주의 성분", "복용 금지"
            )
    );

    private static final Map<String, List<String>> SAFETY_INTERACTION_DETAILS = Map.of(
            "INTERACTION_RISK", List.of(
                    "같이 먹어도", "상호작용", "병용", "중복 성분", "충돌", "같이 복용", "함께 먹어도"
            )
    );

    // 세부 요청 슬롯 추출
    public List<String> extract(String normalizedMessage, List<String> requestedSlots) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return List.of();
        }

        if (requestedSlots == null || requestedSlots.isEmpty()) {
            return List.of();
        }

        Set<String> details = new LinkedHashSet<>();

        for (String slot : requestedSlots) {
            if ("medicine_info".equals(slot)) {
                details.addAll(extractDetailsByKeywords(normalizedMessage, MEDICINE_INFO_DETAILS));
            }

            if ("my_medication_status".equals(slot)) {
                details.addAll(extractDetailsByKeywords(normalizedMessage, MY_MEDICATION_DETAILS));
            }

            if ("safety_contraindication_check".equals(slot)) {
                details.addAll(extractDetailsByKeywords(normalizedMessage, SAFETY_CONTRAINDICATION_DETAILS));
            }

            if ("safety_interaction_check".equals(slot)) {
                details.addAll(extractDetailsByKeywords(normalizedMessage, SAFETY_INTERACTION_DETAILS));
            }
        }

        return new ArrayList<>(details);
    }

    private List<String> extractDetailsByKeywords(String normalizedMessage, Map<String, List<String>> detailKeywords) {
        return detailKeywords.entrySet().stream()
                .filter(entry -> entry.getValue().stream()
                        .anyMatch(normalizedMessage::contains))
                .map(Map.Entry::getKey)
                .toList();
    }
}
