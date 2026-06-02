package com.ibmteam02.backend_consultation.chatbot.controller;

import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_consultation.chatbot.service.ChatbotMessageService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatbotMessageController {

    private final ChatbotMessageService chatbotMessageService;

    // 메세지 전송 & 답변 & 저장
    @PostMapping("/api/chatbot/message")
    public ChatbotMessageResponse sendChat(
            @AuthenticationPrincipal Long userId,
            @RequestBody ChatbotMessageRequest dto
    ) {
        return chatbotMessageService.sendChat(userId, dto);
    }

    // 메세지 목록 조회
    @GetMapping("/api/chatbot/rooms/{roomId}/messages")
    public List<ChatbotMessageResponse> getMessages(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roomId
    ) {
        return chatbotMessageService.getMessages(userId, roomId);
    }

    // 메세지 삭제
    @DeleteMapping("/api/chatbot/messages/{messageId}")
    public void deleteMessage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long messageId
    ) {
        chatbotMessageService.deleteMessage(userId, messageId);
    }
}
