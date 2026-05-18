package com.ibmteam02.backend_medication.chatbot.filter;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RiskKeywordFilter {

    private static final List<String> RISK_KEYWORDS = List.of(
            "숨이안쉬어짐",
            "호흡곤란",
            "가슴답답",
            "두드러기",
            "기절",
            "의식없음",
            "입술부음",
            "목이조임"
    );

    // 위험 키워드 필터링
    public boolean containsRiskKeyword(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        return RISK_KEYWORDS.stream()
                .anyMatch(message::contains);
    }
}
