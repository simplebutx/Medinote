package com.ibmteam02.backend_consultation.consultation.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ConsultationRoomResponse {
    private Long roomId;
    private Long customId;
    private String status;
    private LocalDateTime createdAt;

    private String firstMessage; // 첫 메시지
    private String customerName; // 상담 요청 유저 이름

    private String aiConsultationSummary;
    private Integer rating; // 별점
    private String feedbackComment; // 피드백
}
