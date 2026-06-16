package com.ibmteam02.backend_consultation.chatbot.controller;

import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomCreateRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomResponse;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomUpdateRequest;
import com.ibmteam02.backend_consultation.chatbot.service.ChatbotRoomService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatbotRoomController {

    private final ChatbotRoomService chatbotRoomService;

    @PostMapping("/api/chatbot/rooms")
    public ChatbotRoomResponse createRoom(
            @AuthenticationPrincipal Long userId,
            @RequestBody(required = false) ChatbotRoomCreateRequest request
    ) {
        return chatbotRoomService.createRoom(userId, request);
    }

    @GetMapping("/api/chatbot/rooms")
    public List<ChatbotRoomResponse> getRooms(@AuthenticationPrincipal Long userId) {
        return chatbotRoomService.getRooms(userId);
    }

    @GetMapping("/api/chatbot/rooms/{roomId}")
    public ChatbotRoomResponse getRoom(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roomId
    ) {
        return chatbotRoomService.getRoom(userId, roomId);
    }

    @PatchMapping("/api/chatbot/rooms/{roomId}")
    public ChatbotRoomResponse updateRoom(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roomId,
            @RequestBody ChatbotRoomUpdateRequest request
    ) {
        return chatbotRoomService.updateRoom(userId, roomId, request);
    }

    @DeleteMapping("/api/chatbot/rooms/{roomId}")
    public void deleteRoom(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long roomId
    ) {
        chatbotRoomService.deleteRoom(userId, roomId);
    }
}
