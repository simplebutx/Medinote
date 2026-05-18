package com.ibmteam02.backend_medication.chatbot.service;

import com.ibmteam02.backend_medication.ai.client.AiChatBotClient;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotRequest;
import com.ibmteam02.backend_medication.ai.dto.AiChatBotResponse;
import com.ibmteam02.backend_medication.chatbot.dto.ChatbotMessageRequest;
import com.ibmteam02.backend_medication.chatbot.dto.ChatbotMessageResponse;
import com.ibmteam02.backend_medication.chatbot.extractor.MedicineNameExtractor;
import com.ibmteam02.backend_medication.chatbot.extractor.RequestDetailExtractor;
import com.ibmteam02.backend_medication.chatbot.extractor.RequestSlotExtractor;
import com.ibmteam02.backend_medication.chatbot.filter.MessagePreprocessor;
import com.ibmteam02.backend_medication.chatbot.filter.RiskKeywordFilter;
import com.ibmteam02.backend_medication.chatbot.repository.ChatbotMessageRepository;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class ChatbotMessageService {
    private final ChatbotMessageRepository chatbotMessageRepository;
    private final AiChatBotClient aiChatBotClient;
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;
    private final MessagePreprocessor messagePreprocessor;
    private final RiskKeywordFilter riskKeywordFilter;
    private final MedicineNameExtractor medicineNameExtractor;
    private final RequestSlotExtractor requestSlotExtractor;
    private final RequestDetailExtractor requestDetailExtractor;

    public ChatbotMessageResponse sendChat(ChatbotMessageRequest dto) {

        try {
            String message = dto.getMessage();
            String normalizedMessage = messagePreprocessor.preprocess(message);  // 전처리

            if (riskKeywordFilter.containsRiskKeyword(normalizedMessage)) {  // 키워드 필터링
                return new ChatbotMessageResponse("응급 시 병원에 가세요.");
            }

            List<String> extractedNames = medicineNameExtractor.extract(normalizedMessage);  // 약 이름 추출
            List<String> requestSlots = requestSlotExtractor.extract(normalizedMessage);  // 요청 슬롯 추출

            if (requestSlots.isEmpty()) {
                requestSlots = List.of("general");
            }

            List<String> requestDetails = requestDetailExtractor.extract(normalizedMessage, requestSlots);  // 세부 요청 슬롯 추출
            String medicineContext = handleDbQuery(extractedNames, requestDetails);  // db 조회

            // fastapi 요청
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


            String debugInfo =
                    "추출된 약 이름: " + extractedNames
                            + "\n의도: " + requestSlots
                            + "\n세부: " + requestDetails
                            + "\nDB 조회 정보:\n" + medicineContext;
            // System.out.println(debugInfo);
            return new ChatbotMessageResponse(aiResponse.answer());
        } catch (RestClientException e) {
            return new ChatbotMessageResponse("현재 AI 서버와 통신이 원활하지 않아요. 잠시 후 다시 시도해 주세요.");
        } catch (Exception e) {
            return new ChatbotMessageResponse("요청을 처리하는 중 문제가 발생했어요.");
        }

    }

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
                                    return medicine.getItemName() + "성분 정보가 없습니다.";
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

    private String nullToDefault(String value) {
        if (value == null || value.isBlank()) {
            return "요청한 정보를 아직 지원하지 않아요.";
        }
        return value;
    }
}
