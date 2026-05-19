package com.ibmteam02.backend_consultation.chatbot.extractor;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RequestSlotExtractor {

    private static final Map<String, List<String>> SLOT_KEYWORDS = Map.of(
            "medicine_info", List.of(
                    "효능", "효과", "성분", "주성분", "보관", "보관법",
                    "무슨 약", "어떤 약", "약 정보", "설명",
                    "먹는법", "복용", "복용법", "복용량", "식전", "식후",
                    "공복", "하루몇번", "하루 몇 번", "몇번 먹어", "언제 먹어", "간격",
                    "주의", "주의사항", "경고", "사용 전 경고"
            ),
            "my_medication_status", List.of(
                    "오늘 먹었", "복용 기록", "기록", "복약 일정", "다음 복용", "일정",
                    "알림", "지금 먹는 약", "남아있어", "체크했어", "복용 현황"
            ),
            "safety_contraindication_check", List.of(
                    "알레르기", "금기", "피해야", "먹으면 안되는 성분",
                    "위험 성분", "주의 성분", "복용 금지"
            ),
            "safety_interaction_check", List.of(
                    "같이 먹어도", "상호작용", "병용", "중복 성분",
                    "충돌", "같이 복용", "함께 먹어도"
            )
    );

    // 요청 슬롯 추출
    public List<String> extract(String message) {
        if (message == null || message.isBlank()) {
            return List.of();
        }

        return SLOT_KEYWORDS.entrySet().stream()
                .filter(entry -> entry.getValue().stream()
                        .anyMatch(message::contains))
                .map(Map.Entry::getKey)
                .toList();
    }
}
