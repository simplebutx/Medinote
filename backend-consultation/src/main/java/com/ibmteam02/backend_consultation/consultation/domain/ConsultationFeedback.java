package com.ibmteam02.backend_consultation.consultation.domain;

import com.ibmteam02.backend_consultation.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "consultation_feedbacks")
public class ConsultationFeedback extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConsultationSession session; // 상담방 ID

    @Column(nullable = false)
    private Long pharmacistId; //약사 ID

    @Column(nullable = false)
    private Integer rating; //별점

    private String comment; //한줄평

    @Builder
    private ConsultationFeedback(ConsultationSession session, Long pharmacistId, Integer rating, String comment) {
        this.session = session;
        this.pharmacistId = pharmacistId;
        this.rating = rating;
        this.comment = comment;
    }

    //피드백 생성
    public static ConsultationFeedback createFeedback(ConsultationSession session, Long pharmacistId, Integer rating, String comment) {
        return ConsultationFeedback.builder()
                .session(session)
                .pharmacistId(pharmacistId)
                .rating(rating)
                .comment(comment)
                .build();
    }

}
