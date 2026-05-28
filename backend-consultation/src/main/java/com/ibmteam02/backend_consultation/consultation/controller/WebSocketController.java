package com.ibmteam02.backend_consultation.consultation.controller;

import com.ibmteam02.backend_consultation.consultation.dto.ChatMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    //메세지를 특정 주소로 전달
    private final SimpMessageSendingOperations simpMessageSendingOperations;

    //메세지 발송(Publish) (최종 주소: /app/chat/message)
    @MessageMapping("/consult/message")
    public void message(ChatMessageDto chatMessageDto){

        if(ChatMessageDto.MessageType.ENTER.equals(chatMessageDto.getType())) {
            chatMessageDto = ChatMessageDto.builder()
                    .type(chatMessageDto.getType())
                    .roomId(chatMessageDto.getRoomId())
                    .sender(chatMessageDto.getSender())
                    .message(chatMessageDto.getSender() + "님이 상담방에 입장하셨습니다.")
                    .build();
        }

        //(최종 주소: /topic/chat/room/{roomId})
        simpMessageSendingOperations.convertAndSend("/topic/room/" + chatMessageDto.getRoomId(),chatMessageDto);

    }

}
