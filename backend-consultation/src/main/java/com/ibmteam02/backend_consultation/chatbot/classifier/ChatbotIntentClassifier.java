package com.ibmteam02.backend_consultation.chatbot.classifier;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ChatbotIntentClassifier {

    private static final List<String> SCHEDULE_KEYWORDS = List.of(
            "오늘먹어야하는약","오늘약먹었는지","약먹었는지","복약일정",
            "복용일정","복용기록","복약기록","현재복용","지금복용","먹고있는약",
            "먹는약","다음복용","언제먹어","복용현황","약체크","복약체크"
    );

    // DRUG_INFO, SCHEDULE 판별
    public ChatbotIntentResult classify(String normalizedMessage) {
        if (!containsScheduleKeywords(normalizedMessage)) {
            return new ChatbotIntentResult(ChatbotIntentType.DRUG_INFO, List.of());
        }

        return new ChatbotIntentResult(
                ChatbotIntentType.SCHEDULE,
                extractScheduleRequestDetails(normalizedMessage)
        );
    }

    // 스케쥴 관련 키워드 있는지 체크
    private boolean containsScheduleKeywords(String normalizedMessage) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }

        return SCHEDULE_KEYWORDS.stream().anyMatch(normalizedMessage::contains);
    }

    // 스케쥴 db 조회
    private List<String> extractScheduleRequestDetails(String normalizedMessage) {
        Set<String> details = new LinkedHashSet<>();

        if (normalizedMessage.contains("먹었")
                || normalizedMessage.contains("복용기록")
                || normalizedMessage.contains("복약기록")
                || normalizedMessage.contains("복용현황")
                || normalizedMessage.contains("체크")) {
            details.add("MEDICATION_RECORD");
        }

        if (normalizedMessage.contains("복약일정")
                || normalizedMessage.contains("복용일정")
                || normalizedMessage.contains("다음복용")
                || normalizedMessage.contains("언제먹어")
                || normalizedMessage.contains("오늘먹어야하는약")) {
            details.add("MEDICATION_SCHEDULE");
        }

        if (normalizedMessage.contains("현재복용")
                || normalizedMessage.contains("지금복용")
                || normalizedMessage.contains("먹고있는약")
                || normalizedMessage.contains("먹는약")) {
            details.add("CURRENT_MEDICATION");
        }

        if (details.isEmpty()) {
            details.add("CURRENT_MEDICATION");
            details.add("MEDICATION_SCHEDULE");
            details.add("MEDICATION_RECORD");
        }

        return new ArrayList<>(details);
    }
}
