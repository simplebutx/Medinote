package com.ibmteam02.backend_medication.chatbot.repository;

import com.ibmteam02.backend_medication.chatbot.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotMessageRepository extends JpaRepository<ChatMessage, Long> {
}
