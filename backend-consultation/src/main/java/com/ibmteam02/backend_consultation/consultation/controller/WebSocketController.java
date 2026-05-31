package com.ibmteam02.backend_consultation.consultation.controller;

import com.ibmteam02.backend_consultation.consultation.dto.ChatMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessageSendingOperations simpMessageSendingOperations;
    private final com.ibmteam02.backend_consultation.consultation.service.ConsultationService consultationService;

    //메세지 발송(Publish) (최종 주소: /app/consult/message)
    @MessageMapping("/consult/message")
    public void message(ChatMessageDto chatMessageDto){

        if(ChatMessageDto.MessageType.ENTER.equals(chatMessageDto.getType())) {
            chatMessageDto = ChatMessageDto.builder()
                    .type(chatMessageDto.getType())
                    .roomId(chatMessageDto.getRoomId())
                    .senderId(chatMessageDto.getSenderId())
                    .message(chatMessageDto.getSenderId() + "님이 1:1 상담방에 입장하셨습니다.")
                    .build();
        } else if (ChatMessageDto.MessageType.TALK.equals(chatMessageDto.getType())) {
            // TALK 메시지일 경우에만 DB 저장
            consultationService.saveMessage(chatMessageDto);
        }

        //(최종 주소: /topic/room/{roomId})
        simpMessageSendingOperations.convertAndSend("/topic/room/" + chatMessageDto.getRoomId(), chatMessageDto);
    }
}
