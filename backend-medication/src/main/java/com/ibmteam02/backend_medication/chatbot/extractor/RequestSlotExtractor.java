package com.ibmteam02.backend_medication.chatbot.extractor;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class RequestSlotExtractor {

    private static final Map<String, List<String>> SLOT_KEYWORDS = Map.of(
            "medicine_info", List.of(
                    "효능", "효과", "성분", "주성분", "보관", "보관법",
                    "무슨약", "어떤약", "약정보", "설명",
                    "먹는법", "복용", "복용법", "복용량", "식전", "식후",
                    "공복", "하루몇번", "하루에몇번", "몇번먹어", "언제먹어", "간격"
            ),
            "my_medication_status", List.of(
                    "오늘먹었", "복용기록", "기록", "복약일정", "다음복용", "일정",
                    "알림", "지금복용중", "남아있어", "체크됐어", "복용현황"
            ),
            "safety_contraindication_check", List.of(
                    "알레르기", "금기", "피해야", "못먹는성분",
                    "위험성분", "주의성분", "복용금지"
            ),
            "safety_interaction_check", List.of(
                    "같이먹어도", "상호작용", "병용", "중복성분",
                    "충돌", "같이복용", "함께먹어도"
            )
    );

    // 요청 슬롯 추출
    public List<String> extract(String message) {
        if (message == null || message.isBlank()) {
            return List.of();
        }

        return SLOT_KEYWORDS.entrySet().stream()
                .filter(entry -> entry.getValue().stream()  // 값 뽑기
                        .anyMatch(message::contains))  // 슬롯키워드-메세지 매칭
                .map(Map.Entry::getKey)  // 키 뽑기
                .toList();
    }
}
