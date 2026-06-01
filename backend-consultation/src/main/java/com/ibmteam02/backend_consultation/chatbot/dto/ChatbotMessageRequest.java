package com.ibmteam02.backend_consultation.chatbot.dto;

import lombok.Getter;

@Getter
public class ChatbotMessageRequest {
    private Long roomId;
    private String message;
}

