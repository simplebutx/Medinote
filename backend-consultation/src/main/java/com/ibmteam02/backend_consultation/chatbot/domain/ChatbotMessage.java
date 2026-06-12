package com.ibmteam02.backend_consultation.chatbot.domain;

import com.ibmteam02.backend_consultation.chatbot.dto.SenderType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class ChatbotMessage {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatbotRoom chatbotRoom;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "answer_type")
    private String answerType = "NORMAL";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private ChatbotMessage(ChatbotRoom chatbotRoom, SenderType senderType, String content) {
        this.chatbotRoom = chatbotRoom;
        this.senderType = senderType;
        this.content = content;
        this.answerType = "NORMAL";
    }

    private ChatbotMessage(ChatbotRoom chatbotRoom, SenderType senderType, String content, String answerType) {
        this.chatbotRoom = chatbotRoom;
        this.senderType = senderType;
        this.content = content;
        this.answerType = normalizeAnswerType(answerType);
    }

    public static ChatbotMessage create(ChatbotRoom chatbotRoom, SenderType senderType, String content) {
        return new ChatbotMessage(chatbotRoom, senderType, content);
    }

    public static ChatbotMessage create(ChatbotRoom chatbotRoom, SenderType senderType, String content, String answerType) {
        return new ChatbotMessage(chatbotRoom, senderType, content, answerType);
    }

    public void updateContent(String content) {
        this.content = content;
    }

    private static String normalizeAnswerType(String answerType) {
        if (answerType == null || answerType.isBlank()) {
            return "NORMAL";
        }
        return answerType;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
