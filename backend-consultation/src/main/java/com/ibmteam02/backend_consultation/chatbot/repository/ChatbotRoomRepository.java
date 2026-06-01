package com.ibmteam02.backend_consultation.chatbot.repository;

import com.ibmteam02.backend_consultation.chatbot.domain.ChatbotRoom;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotRoomRepository extends JpaRepository<ChatbotRoom, Long> {
    List<ChatbotRoom> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
