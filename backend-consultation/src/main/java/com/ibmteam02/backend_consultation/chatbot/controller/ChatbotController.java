package com.ibmteam02.backend_consultation.chatbot.controller;

import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_consultation.chatbot.service.ChatbotMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotMessageService chatbotMessageService;

    // 프론트 -> consultation(8082)
    @PostMapping("/api/chatbot/message")
    public ChatbotMessageResponse sendChat(@RequestBody ChatbotMessageRequest dto) {
            return chatbotMessageService.sendChat(dto);
    }
}

