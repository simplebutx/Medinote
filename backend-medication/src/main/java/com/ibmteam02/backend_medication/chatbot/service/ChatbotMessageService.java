package com.ibmteam02.backend_medication.chatbot.service;

import com.ibmteam02.backend_medication.ai.client.AiChatBotClient;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotResponse;
import com.ibmteam02.backend_medication.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_medication.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_medication.chatbot.extractor.RequestDetailExtractor;
import com.ibmteam02.backend_medication.chatbot.extractor.RequestSlotExtractor;
import com.ibmteam02.backend_medication.chatbot.filter.MessagePreprocessor;
import com.ibmteam02.backend_medication.chatbot.filter.RiskKeywordFilter;
import com.ibmteam02.backend_medication.chatbot.repository.ChatbotMessageRepository;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

@Slf4j   // logger
@Service
@RequiredArgsConstructor
public class ChatbotMessageService {
    // @활명수, @타이레놀처럼 사용자가 직접 확정한 약 이름을 우선 추출
    private static final Pattern MEDICINE_MENTION_PATTERN = Pattern.compile("@([^\\s,]+)");

    private final ChatbotMessageRepository chatbotMessageRepository;
    private final AiChatBotClient aiChatBotClient;
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;
    private final MessagePreprocessor messagePreprocessor;
    private final RiskKeywordFilter riskKeywordFilter;
    private final RequestSlotExtractor requestSlotExtractor;
    private final RequestDetailExtractor requestDetailExtractor;

    public ChatbotMessageResponse sendChat(ChatbotMessageRequest dto) {
        try {
            // 메시지 전처리 후 위험 키워드 확인
            String message = dto.getMessage();
            String normalizedMessage = messagePreprocessor.preprocess(message);

            if (riskKeywordFilter.containsRiskKeyword(normalizedMessage)) {
                return new ChatbotMessageResponse("응급 시 병원에 가세요.");
            }

            // @로 직접 선택한 약 이름
            List<String> extractedNames = extractMentionedMedicineNames(message);


            // 사용자 요청을 큰 슬롯과 세부 요청으로 분류
            List<String> requestSlots = requestSlotExtractor.extract(normalizedMessage);
            if (requestSlots.isEmpty()) {
                requestSlots = List.of("general");
            }

            // 추출된 약 이름과 세부 요청을 기준으로 DB 조회 컨텍스트 생성
            List<String> requestDetails = requestDetailExtractor.extract(normalizedMessage, requestSlots);
            String medicineContext = handleDbQuery(extractedNames, requestDetails);

            // 원본 질문 + 추출 결과 + DB 조회 결과를 FastAPI로 전달
            AiChatBotRequest aiRequest = new AiChatBotRequest(
                    message,
                    normalizedMessage,
                    extractedNames,
                    requestSlots,
                    requestDetails,
                    medicineContext
            );

            AiChatBotResponse aiResponse = aiChatBotClient.sendChat(aiRequest);
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

            return new ChatbotMessageResponse(aiResponse.answer());
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

        Matcher matcher = MEDICINE_MENTION_PATTERN.matcher(message);
        Set<String> names = new LinkedHashSet<>();

        while (matcher.find()) {
            String name = matcher.group(1).trim();
            if (!name.isBlank()) {
                names.add(name);
            }
        }

        return new ArrayList<>(names);
    }

    // 세부 요청에 맞는 약 정보를 DB에서 조합해 LLM 컨텍스트 문자열로 반환
    private String handleDbQuery(List<String> extractedNames, List<String> requestDetails) {
        if (extractedNames == null || extractedNames.isEmpty()) {
            return "약 이름을 찾지 못했어요.";
        }

        List<MedicineInfo> medicineInfos = medicineInfoRepository.findByItemNameIn(extractedNames);

        if (medicineInfos.isEmpty()) {
            return "해당 약 정보를 찾지 못했어요.";
        }

        StringBuilder result = new StringBuilder();

        if (requestDetails.contains("EFFICACY")) {
            result.append("[효능]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getEfficacy()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails.contains("USE_METHOD")) {
            result.append("[복용법]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getUseMethod()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails.contains("STORAGE_METHOD")) {
            result.append("[보관법]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getStorageMethod()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails.contains("CAUTION_WARNING")) {
            result.append("[주의사항]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName()
                                    + "\n사용 전 경고: " + nullToDefault(medicine.getWarningBeforeUse())
                                    + "\n주의사항: " + nullToDefault(medicine.getCaution()))
                            .collect(Collectors.joining("\n\n"))
            ).append("\n\n");
        }

        if (requestDetails.contains("INGREDIENT")) {
            result.append("[성분]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> {
                                List<MedicineIngredient> ingredients =
                                        medicineIngredientRepository.findByItemSeq(medicine.getItemSeq());

                                if (ingredients.isEmpty()) {
                                    return medicine.getItemName() + ": 성분 정보가 없습니다.";
                                }

                                String ingredientText = ingredients.stream()
                                        .map(ingredient -> ingredient.getIngredientName()
                                                + " " + nullToDefault(ingredient.getQuantity())
                                                + nullToDefault(ingredient.getUnit()))
                                        .collect(Collectors.joining(", "));

                                return medicine.getItemName() + ": " + ingredientText;
                            })
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (result.length() == 0) {
            return "요청한 정보를 아직 지원하지 않아요.";
        }

        return result.toString().trim();
    }

    // DB 값이 비어 있을 때 기본 문구로 대체
    private String nullToDefault(String value) {
        if (value == null || value.isBlank()) {
            return "정보가 없습니다.";
        }
        return value;
    }
}
