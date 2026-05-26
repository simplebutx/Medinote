package com.ibmteam02.backend_consultation.consultation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
public class ChatMessageDto {

    public enum MessageType{
        ENTER, TALK
    }

    private MessageType type;
    private Long roomId;
    private String sender;
    private String message;


    public ChatMessageDto(MessageType type,Long roomId, String sender, String message){
        this.type = type;
        this.roomId = roomId;
        this.sender = sender;
        this.message = message;
    }
}
