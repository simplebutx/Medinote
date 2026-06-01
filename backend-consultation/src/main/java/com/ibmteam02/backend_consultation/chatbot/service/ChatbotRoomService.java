package com.ibmteam02.backend_consultation.chatbot.service;

import com.ibmteam02.backend_consultation.chatbot.domain.ChatbotRoom;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomCreateRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomResponse;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotRoomUpdateRequest;
import com.ibmteam02.backend_consultation.chatbot.repository.ChatbotMessageRepository;
import com.ibmteam02.backend_consultation.chatbot.repository.ChatbotRoomRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatbotRoomService {

    private static final String DEFAULT_ROOM_TITLE = "새 대화";

    private final ChatbotRoomRepository chatbotRoomRepository;
    private final ChatbotMessageRepository chatbotMessageRepository;

    // 채팅방 생성
    @Transactional
    public ChatbotRoomResponse createRoom(Long userId, ChatbotRoomCreateRequest request) {
        String title = normalizeTitle(request != null ? request.getTitle() : null);
        ChatbotRoom savedRoom = chatbotRoomRepository.save(ChatbotRoom.create(userId, title));
        return toResponse(savedRoom);
    }

    // 채팅방 목록 조회
    public List<ChatbotRoomResponse> getRooms(Long userId) {
        return chatbotRoomRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 채팅방 조회
    public ChatbotRoomResponse getRoom(Long userId, Long roomId) {
        return toResponse(getOwnedRoom(userId, roomId));
    }

    // 채팅방 수정
    @Transactional
    public ChatbotRoomResponse updateRoom(Long userId, Long roomId, ChatbotRoomUpdateRequest request) {
        ChatbotRoom room = getOwnedRoom(userId, roomId);
        room.updateTitle(normalizeTitle(request != null ? request.getTitle() : null));
        return toResponse(room);
    }

    @Transactional
    public void deleteRoom(Long userId, Long roomId) {
        ChatbotRoom room = getOwnedRoom(userId, roomId);
        chatbotMessageRepository.deleteByChatbotRoom_Id(room.getId());
        chatbotRoomRepository.delete(room);
    }

    // 본인 소유 채팅방 확인
    private ChatbotRoom getOwnedRoom(Long userId, Long roomId) {
        ChatbotRoom room = chatbotRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채팅방입니다."));

        if (!room.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인 채팅방만 조회할 수 있습니다.");
        }

        return room;
    }

    private String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return DEFAULT_ROOM_TITLE;
        }
        return title.trim();
    }

    private ChatbotRoomResponse toResponse(ChatbotRoom room) {
        return ChatbotRoomResponse.builder()
                .roomId(room.getId())
                .userId(room.getUserId())
                .title(room.getTitle())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}
