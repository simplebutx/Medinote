package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineChatbotContextService {

    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;

    // llm에게 넘겨줄 db 조회 정보들 빌드
    @Transactional(readOnly = true)
    public String buildChatbotContext(List<String> extractedNames, List<String> requestDetails) {
        if (extractedNames == null || extractedNames.isEmpty()) {
            return "약 이름을 찾지 못했어요.";
        }

        List<MedicineInfo> medicineInfos = medicineInfoRepository.findByItemNameIn(extractedNames);

        if (medicineInfos.isEmpty()) {
            return "해당 약 정보를 찾지 못했어요.";
        }

        StringBuilder result = new StringBuilder();

        if (requestDetails != null && requestDetails.contains("EFFICACY")) {
            result.append("[효능]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getEfficacy()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails != null && requestDetails.contains("USE_METHOD")) {
            result.append("[복용법]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getUseMethod()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails != null && requestDetails.contains("STORAGE_METHOD")) {
            result.append("[보관법]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName() + ": " + nullToDefault(medicine.getStorageMethod()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }

        if (requestDetails != null && requestDetails.contains("CAUTION_WARNING")) {
            result.append("[주의사항]\n");
            result.append(
                    medicineInfos.stream()
                            .map(medicine -> medicine.getItemName()
                                    + "\n사용 전 경고: " + nullToDefault(medicine.getWarningBeforeUse())
                                    + "\n주의사항: " + nullToDefault(medicine.getCaution()))
                            .collect(Collectors.joining("\n\n"))
            ).append("\n\n");
        }

        if (requestDetails != null && requestDetails.contains("INGREDIENT")) {
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

    private String nullToDefault(String value) {
        if (value == null || value.isBlank()) {
            return "정보가 없습니다.";
        }
        return value;
    }
}
