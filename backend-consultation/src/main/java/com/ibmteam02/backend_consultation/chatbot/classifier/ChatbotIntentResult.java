package com.ibmteam02.backend_consultation.chatbot.classifier;

import java.util.List;

public record ChatbotIntentResult(
        ChatbotIntentType questionType,
        List<String> scheduleRequestDetails
) {
    public boolean isScheduleQuestion() {
        return questionType == ChatbotIntentType.SCHEDULE;
    }
}
