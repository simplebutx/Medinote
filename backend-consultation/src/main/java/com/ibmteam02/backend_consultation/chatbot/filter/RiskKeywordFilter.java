package com.ibmteam02.backend_consultation.chatbot.filter;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RiskKeywordFilter {

    private static final List<String> RISK_KEYWORDS = List.of(
            "호흡곤란",
            "숨이 차",
            "가슴답답",
            "가슴이 답답",
            "두드러기",
            "실신",
            "의식 없음",
            "목이 조임"
    );

    // 위험 키워드 포함 여부 확인
    public boolean containsRiskKeyword(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        return RISK_KEYWORDS.stream()
                .anyMatch(message::contains);
    }
}
