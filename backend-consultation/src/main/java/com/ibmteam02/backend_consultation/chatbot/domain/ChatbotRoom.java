package com.ibmteam02.backend_consultation.chatbot.domain;

import com.ibmteam02.backend_consultation.global.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class ChatbotRoom extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;  // 채팅방 이름

    private ChatbotRoom(Long userId, String title) {
        this.userId = userId;
        this.title = title;
    }

    public static ChatbotRoom create(Long userId, String title) {
        return new ChatbotRoom(userId, title);
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void touch() {
        super.preUpdate();
    }
}
