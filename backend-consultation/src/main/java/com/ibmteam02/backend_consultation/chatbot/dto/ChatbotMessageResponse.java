package com.ibmteam02.backend_consultation.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ChatbotMessageResponse {
    private Long messageId;
    private String answer;
    private String answerType;
    private Long roomId;
    private String senderType;
    private String content;
    private LocalDateTime createdAt;

    public ChatbotMessageResponse(String answer) {
        this.messageId = null;
        this.answer = answer;
        this.answerType = "NORMAL";
        this.roomId = null;
        this.senderType = null;
        this.content = null;
        this.createdAt = null;
    }
}

