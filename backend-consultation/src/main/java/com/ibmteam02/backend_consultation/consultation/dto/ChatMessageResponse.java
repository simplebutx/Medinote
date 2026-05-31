package com.ibmteam02.backend_consultation.consultation.dto;

import com.ibmteam02.backend_consultation.consultation.domain.SenderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class ChatMessageResponse {
    private Long messageId;
    private Long senderId;
    private SenderType senderType;
    private String content;
    private LocalDateTime createdAt;
}
