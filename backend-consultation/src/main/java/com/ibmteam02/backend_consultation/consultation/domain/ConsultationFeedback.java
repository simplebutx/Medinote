package com.ibmteam02.backend_consultation.consultation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "consultation_feedbacks")
public class ConsultationFeedback {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConsultationSession session;

    @Column(nullable = false)
    private Long pharmacistId;

    @Column(nullable = false)
    private Integer rating;

    private String comment;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private ConsultationFeedback(ConsultationSession session, Long pharmacistId, Integer rating, String comment) {
        this.session = session;
        this.pharmacistId = pharmacistId;
        this.rating = rating;
        this.comment = comment;
    }

    public static ConsultationFeedback createFeedback(ConsultationSession session, Long pharmacistId, Integer rating, String comment) {
        return ConsultationFeedback.builder()
                .session(session)
                .pharmacistId(pharmacistId)
                .rating(rating)
                .comment(comment)
                .build();
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
