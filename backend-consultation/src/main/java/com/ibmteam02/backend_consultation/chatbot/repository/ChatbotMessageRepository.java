package com.ibmteam02.backend_consultation.chatbot.repository;

import com.ibmteam02.backend_consultation.chatbot.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotMessageRepository extends JpaRepository<ChatMessage, Long> {
}

