package com.ibmteam02.backend_medication.chatbot.filter;

import org.springframework.stereotype.Component;

@Component
public class MessagePreprocessor {

    // 전처리
    public String preprocess(String message) {
        if (message == null) {
            return "";
        }

        return message.toLowerCase()
                .replaceAll("\\s+", "")  // 공백제거
                .replaceAll("[^가-힣a-z0-9]", "");  // 특수문자제거
    }
}
