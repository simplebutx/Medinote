package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import com.ibmteam02.backend_medication.caution.repository.UserMedicationCautionRepository;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.dto.MedicineSearchResponse;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicineSearchService {

    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;
    private final UserMedicationCautionRepository userMedicationCautionRepository;


    // 약이름 자동완성
    public List<String> suggestMedicine(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        return medicineInfoRepository.findTop10ByItemNameContaining(keyword).stream()
                .map(MedicineInfo::getItemName)
                .distinct()
                .toList();
    }

    // 약 검색 결과
    public MedicineSearchResponse searchMedicine(Long userId, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("keyword is blank");
        }

        MedicineInfo medicine = medicineInfoRepository.findByItemName(keyword)
                .orElseThrow(() -> new IllegalArgumentException("medicine not found"));

        List<MedicineIngredient> ingredients = medicineIngredientRepository.findByItemSeq(medicine.getItemSeq());
        // 주의약, 주의성분 비교
        // 내 caution 테이블에있는 약 가져와서 약이랑비교 -> true 면 주의1 true
        // 내 caution 테이블에있는 성분 가져와서 약의 성분이랑 비교 -> true 면 주의2 true

        List<UserMedicationCaution> cautionMedication = userMedicationCautionRepository.findAllMedicineCautionsByUserId(userId);
        boolean warningMedicine = cautionMedication.stream()
                .anyMatch(caution-> medicine.getItemName().equals(caution.getItemName()));


        List<UserMedicationCaution> cautionIngredient = userMedicationCautionRepository.findAllIngredientCautionsByUserId(userId);
        boolean warningIngredient = ingredients.stream()
                .anyMatch(ingredient -> cautionIngredient.stream()
                        .anyMatch(caution -> ingredient.getIngredientName().equals(caution.getIngredientName())));

        return new MedicineSearchResponse(
                medicine.getItemSeq(),
                medicine.getItemName(),
                medicine.getCompanyName(),
                formatIngredientSummary(medicine.getItemSeq()),
                medicine.getEfficacy(),
                medicine.getUseMethod(),
                medicine.getWarningBeforeUse(),
                medicine.getCaution(),
                medicine.getInteraction(),
                medicine.getSideEffect(),
                medicine.getStorageMethod(),
                medicine.getUpdateDe(),
                medicine.getImageUrl(),
                medicine.getEfficacyDocumentId(),
                medicine.getUsageDocumentId(),
                medicine.getPrecautionDocumentId(),
                warningMedicine, warningIngredient
        );
    }

    private String formatIngredientSummary(Long itemSeq) {
        List<MedicineIngredient> ingredients = medicineIngredientRepository.findByItemSeq(itemSeq);
        if (ingredients.isEmpty()) {
            return "성분 정보가 없습니다.";
        }

        return ingredients.stream()
                .map(ingredient -> formatIngredient(ingredient.getIngredientName(), ingredient.getQuantity(), ingredient.getUnit()))
                .filter(text -> !text.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String formatIngredient(String ingredientName, String quantity, String unit) {
        String safeName = ingredientName == null ? "" : ingredientName.trim();
        String safeQuantity = quantity == null ? "" : quantity.trim();
        String safeUnit = unit == null ? "" : unit.trim();

        StringBuilder builder = new StringBuilder(safeName);
        if (!safeQuantity.isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(safeQuantity);
        }
        if (!safeUnit.isBlank()) {
            builder.append(safeUnit);
        }
        return builder.toString().trim();
    }
}
