package com.ibmteam02.backend_consultation.chatbot.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class ChatbotRoom {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
