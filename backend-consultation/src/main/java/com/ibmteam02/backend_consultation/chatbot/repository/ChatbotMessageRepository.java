package com.ibmteam02.backend_consultation.chatbot.repository;

import com.ibmteam02.backend_consultation.chatbot.domain.ChatbotMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, Long> {
    void deleteByChatbotRoom_Id(Long chatRoomId);
    List<ChatbotMessage> findByChatbotRoom_IdOrderByCreatedAtAsc(Long roomId);
}
