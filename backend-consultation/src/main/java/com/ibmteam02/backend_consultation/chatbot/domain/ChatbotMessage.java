package com.ibmteam02.backend_consultation.chatbot.domain;

import com.ibmteam02.backend_consultation.chatbot.dto.SenderType;
import com.ibmteam02.backend_consultation.global.common.BaseTimeEntity;
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
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class ChatbotMessage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatbotRoom chatbotRoom;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType;   // 사용자인지 챗봇인지

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private ChatbotMessage(ChatbotRoom chatbotRoom, SenderType senderType, String content) {
        this.chatbotRoom = chatbotRoom;
        this.senderType = senderType;
        this.content = content;
    }

    public static ChatbotMessage create(ChatbotRoom chatbotRoom, SenderType senderType, String content) {
        return new ChatbotMessage(chatbotRoom, senderType, content);
    }

    public void updateContent(String content) {
        this.content = content;
    }
}
