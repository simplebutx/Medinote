package com.ibmteam02.backend_consultation.chatbot.service;

import com.ibmteam02.backend_consultation.ai.client.AiChatBotClient;
import com.ibmteam02.backend_consultation.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_consultation.ai.dto.AiChatBotResponse;
import com.ibmteam02.backend_consultation.chatbot.domain.ChatbotMessage;
import com.ibmteam02.backend_consultation.chatbot.domain.ChatbotRoom;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_consultation.chatbot.dto.SenderType;
import com.ibmteam02.backend_consultation.chatbot.filter.MessagePreprocessor;
import com.ibmteam02.backend_consultation.chatbot.filter.RiskKeywordFilter;
import com.ibmteam02.backend_consultation.chatbot.repository.ChatbotMessageRepository;
import com.ibmteam02.backend_consultation.chatbot.repository.ChatbotRoomRepository;
import com.ibmteam02.backend_consultation.medication.client.MedicationClient;
import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextRequest;
import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextResponse;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@Slf4j   // logger
@Service
@RequiredArgsConstructor
public class ChatbotMessageService {
    private static final Pattern MEDICINE_MENTION_PATTERN = Pattern.compile("@([^\\s,]+)");

    private final ChatbotMessageRepository chatbotMessageRepository;
    private final ChatbotRoomRepository chatbotRoomRepository;
    private final AiChatBotClient aiChatBotClient;
    private final MedicationClient medicationClient;
    private final MessagePreprocessor messagePreprocessor;
    private final RiskKeywordFilter riskKeywordFilter;

    @Transactional
    public ChatbotMessageResponse sendChat(Long userId, ChatbotMessageRequest dto) {
        ChatbotRoom room = getOwnedRoom(userId, dto.getRoomId());

        try {
            // 메시지 전처리와 위험 키워드 확인
            String message = dto.getMessage();
            String normalizedMessage = messagePreprocessor.preprocess(message);

            chatbotMessageRepository.save(ChatbotMessage.create(room, SenderType.USER, message));
            room.touch();

            if (riskKeywordFilter.containsRiskKeyword(normalizedMessage)) {
                ChatbotMessage savedBotMessage = chatbotMessageRepository.save(
                        ChatbotMessage.create(room, SenderType.BOT, "응급 시 병원에 가세요.")
                );
                room.touch();
                return toResponse(savedBotMessage);
            }

            // @로 직접 선택한 약 이름
            List<String> extractedNames = extractMentionedMedicineNames(message);

            // 원본 질문 + 추출 결과 + DB 조회 결과를 FastAPI로 전달
            AiChatBotRequest aiRequest = new AiChatBotRequest(
                    message,
                    normalizedMessage,
                    extractedNames
            );

            AiChatBotResponse aiResponse = aiChatBotClient.sendChat(aiRequest);  // consultation(8082) -> ai(8000)
            if (aiResponse == null || aiResponse.answer() == null || aiResponse.answer().isBlank()) {
                ChatbotMessage savedBotMessage = chatbotMessageRepository.save(
                        ChatbotMessage.create(room, SenderType.BOT, "답변을 생성하지 못했어요. 다시 시도해 주세요.")
                );
                room.touch();
                return toResponse(savedBotMessage);
            }

            log.debug(
                    "추출된 약 이름: {}",
                    extractedNames
            );

            ChatbotMessage savedBotMessage = chatbotMessageRepository.save(
                    ChatbotMessage.create(room, SenderType.BOT, aiResponse.answer())
            );
            room.touch();
            return toResponse(savedBotMessage);  // ai(8000) -> consultation(8082)
        } catch (RestClientException e) {
            return new ChatbotMessageResponse("현재 AI 서버와 통신이 원활하지 않아요. 잠시 후 다시 시도해 주세요.");
        } catch (Exception e) {
            return new ChatbotMessageResponse("요청을 처리하는 중 문제가 발생했어요.");
        }
    }

    // 메시지 안의 @약이름을 중복 없이 추출
    private List<String> extractMentionedMedicineNames(String message) {
        if (message == null || message.isBlank()) {
            return List.of();
        }

        Matcher matcher = MEDICINE_MENTION_PATTERN.matcher(message); // @약이름 패턴을 찾을 준비
        Set<String> names = new LinkedHashSet<>();  // 중복 없이 순서대로

        // @약이름을 하나씩 찾아서 이름만 꺼내 names에 담음
        while (matcher.find()) {
            String name = matcher.group(1).trim();
            if (!name.isBlank()) {
                names.add(name);
            }
        }
        return new ArrayList<>(names);
    }


    // 메시지 목록 조회
    @Transactional(readOnly = true)
    public List<ChatbotMessageResponse> getMessages(Long userId, Long roomId) {
        ChatbotRoom room = getOwnedRoom(userId, roomId);

        return chatbotMessageRepository.findByChatbotRoom_IdOrderByCreatedAtAsc(room.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 메시지 삭제
    @Transactional
    public void deleteMessage(Long userId, Long messageId) {
        ChatbotMessage message = getOwnedMessage(userId, messageId);
        chatbotMessageRepository.delete(message);
        message.getChatbotRoom().touch();
    }

    private ChatbotRoom getOwnedRoom(Long userId, Long roomId) {
        ChatbotRoom room = chatbotRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));

        if (!room.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인 채팅방만 조회할 수 있습니다.");
        }

        return room;
    }

    // 본인 소유 체크
    private ChatbotMessage getOwnedMessage(Long userId, Long messageId) {
        ChatbotMessage message = chatbotMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("메시지를 찾을 수 없습니다."));

        if (!message.getChatbotRoom().getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인 메시지만 접근할 수 있습니다.");
        }

        return message;
    }

    private ChatbotMessageResponse toResponse(ChatbotMessage message) {
        return new ChatbotMessageResponse(
                message.getId(),
                message.getContent(),
                message.getChatbotRoom().getId(),
                message.getSenderType().name(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
