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

    private String firstMessage; //첫 메세지
    private String customerName; //상담 신청 유저 이름
}
