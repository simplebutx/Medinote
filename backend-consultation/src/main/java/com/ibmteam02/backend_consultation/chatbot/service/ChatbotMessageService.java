package com.ibmteam02.backend_consultation.chatbot.service;

import com.ibmteam02.backend_consultation.ai.client.AiChatBotClient;
import com.ibmteam02.backend_consultation.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_consultation.ai.dto.AiChatBotResponse;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_consultation.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_consultation.chatbot.extractor.RequestDetailExtractor;
import com.ibmteam02.backend_consultation.chatbot.extractor.RequestSlotExtractor;
import com.ibmteam02.backend_consultation.chatbot.filter.MessagePreprocessor;
import com.ibmteam02.backend_consultation.chatbot.filter.RiskKeywordFilter;
import com.ibmteam02.backend_consultation.chatbot.repository.ChatbotMessageRepository;
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
import org.springframework.web.client.RestClientException;

@Slf4j   // logger
@Service
@RequiredArgsConstructor
public class ChatbotMessageService {
    // 사용자가 직접 확정한 약 이름
    private static final Pattern MEDICINE_MENTION_PATTERN = Pattern.compile("@([^\\s,]+)");

    private final ChatbotMessageRepository chatbotMessageRepository;
    private final AiChatBotClient aiChatBotClient;
    private final MedicationClient medicationClient;
    private final MessagePreprocessor messagePreprocessor;
    private final RiskKeywordFilter riskKeywordFilter;
    private final RequestSlotExtractor requestSlotExtractor;
    private final RequestDetailExtractor requestDetailExtractor;

    public ChatbotMessageResponse sendChat(Long userId, ChatbotMessageRequest dto) {
        try {
            // 메시지 전처리와 위험 키워드 확인
            String message = dto.getMessage();
            String normalizedMessage = messagePreprocessor.preprocess(message);

            if (riskKeywordFilter.containsRiskKeyword(normalizedMessage)) {
                return new ChatbotMessageResponse("응급 시 병원에 가세요.");
            }

            // @로 직접 선택한 약 이름
            List<String> extractedNames = extractMentionedMedicineNames(message);

            // 사용자 요청을 의도와 세부 요청으로 분류
            List<String> requestSlots = requestSlotExtractor.extract(normalizedMessage);
            if (requestSlots.isEmpty()) {
                requestSlots = List.of("general");
            }

            // 추출한 약 이름과 세부 요청을 기준으로 DB 조회 컨텍스트 생성
            List<String> requestDetails = requestDetailExtractor.extract(normalizedMessage, requestSlots);
            String medicineContext = handleDbQuery(userId, extractedNames, requestDetails);

            // 원본 질문 + 추출 결과 + DB 조회 결과를 FastAPI로 전달
            AiChatBotRequest aiRequest = new AiChatBotRequest(
                    message,
                    normalizedMessage,
                    extractedNames,
                    requestSlots,
                    requestDetails,
                    medicineContext
            );

            AiChatBotResponse aiResponse = aiChatBotClient.sendChat(aiRequest);  // consultation(8082) -> ai(8000)
            if (aiResponse == null || aiResponse.answer() == null || aiResponse.answer().isBlank()) {
                return new ChatbotMessageResponse("답변을 생성하지 못했어요. 다시 시도해 주세요.");
            }

            log.debug(
                    "추출된 약 이름: {}, 의도: {}, 세부: {}, DB 조회 정보: {}",
                    extractedNames,
                    requestSlots,
                    requestDetails,
                    medicineContext
            );

            return new ChatbotMessageResponse(aiResponse.answer());  // ai(8000) -> consultation(8082)
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

    // 세부 요청에 맞는 약 정보를 DB에서 조합해 LLM 컨텍스트 문자열로 반환
    private String handleDbQuery(Long userId, List<String> extractedNames, List<String> requestDetails) {
        // consultation(8082) -> medication(8081)
        ChatbotMedicineContextResponse response = medicationClient.getChatbotContext(
                new ChatbotMedicineContextRequest(userId, extractedNames, requestDetails)
        );

        if (response == null || response.medicineContext() == null || response.medicineContext().isBlank()) {
            return "약 정보 컨텍스트를 불러오지 못했어요.";
        }

        return response.medicineContext();
    }
}
