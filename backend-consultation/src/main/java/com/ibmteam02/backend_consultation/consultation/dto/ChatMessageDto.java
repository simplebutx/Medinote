package com.ibmteam02.backend_consultation.consultation.dto;

import com.ibmteam02.backend_consultation.consultation.domain.SenderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {

    public enum MessageType{
        ENTER, TALK
    }

    private MessageType type;
    private Long roomId;
    private Long senderId;
    private SenderType senderType;
    private String message;

}
