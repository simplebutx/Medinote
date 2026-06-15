package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.ai.client.AiPrescriptionAnalysisClient;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisItem;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisKeywordGroup;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisMedicine;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisRequest;
import com.ibmteam02.backend_medication.ai.dto.AiPrescriptionAnalysisResponse;
import com.ibmteam02.backend_medication.auth.client.AuthUserContextClient;
import com.ibmteam02.backend_medication.auth.dto.AuthUserHealthContextRequest;
import com.ibmteam02.backend_medication.auth.dto.AuthUserHealthContextResponse;
import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import com.ibmteam02.backend_medication.caution.repository.UserMedicationCautionRepository;
import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineCautionTagRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionAnalysisResponse;
import com.ibmteam02.backend_medication.prescription.dto.PrescriptionAnalysisResultItem;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class PrescriptionAnalysisService {

    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;
    private final MedicineCautionTagRepository medicineCautionTagRepository;
    private final UserMedicationCautionRepository userMedicationCautionRepository;
    private final AuthUserContextClient authUserContextClient;
    private final AiPrescriptionAnalysisClient aiPrescriptionAnalysisClient;

    // 처방전 분석
    @Transactional(readOnly = true)
    public PrescriptionAnalysisResponse analyzePrescription(
            Long userId,
            Long scheduleId
    ) {
        if (userId == null) {
            throw new ForbiddenException("Authenticated user is required.");
        }

        // 처방전(스케쥴) 불러와서 약목록 뽑고, 사용자 주의사항에서 약주의, 성분주의 리스트로 뽑기
        MedicationSchedule schedule = medicationScheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found."));
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(schedule.getId());
        List<UserMedicationCaution> medicineCautions =
                userMedicationCautionRepository.findAllMedicineCautionsByUserId(userId);
        List<UserMedicationCaution> ingredientCautions =
                userMedicationCautionRepository.findAllIngredientCautionsByUserId(userId);

        List<PrescriptionAnalysisResultItem> localItems = medicines.stream()
                .map(medicine -> analyzeMedicine(medicine, medicineCautions, ingredientCautions))
                .toList();
        Map<Long, AiPrescriptionAnalysisItem> aiItemsByScheduleMedicineId =
                analyzeHealthAndDiseaseCautions(userId, scheduleId, localItems).stream()
                        .filter(item -> item.scheduleMedicineId() != null)
                        .collect(Collectors.toMap(
                                AiPrescriptionAnalysisItem::scheduleMedicineId,
                                Function.identity(),
                                (left, right) -> left
                        ));

        // 주의약/성분 겹치는지 검사 후 리스트로 모으기
        List<PrescriptionAnalysisResultItem> items = localItems.stream()
                .map(item -> mergeAiAnalysis(item, aiItemsByScheduleMedicineId.get(item.scheduleMedicineId())))
                .toList();
        boolean hasWarning = items.stream()
                .anyMatch(item -> item.warningMedicine()
                        || item.warningIngredient()
                        || item.warningDisease()
                        || item.warningHealthInfo());
        List<String> matchedMedicineNames = items.stream()
                .filter(PrescriptionAnalysisResultItem::warningMedicine)
                .map(PrescriptionAnalysisResultItem::medicineName)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        List<String> matchedIngredientNames = items.stream()
                .flatMap(item -> item.matchedIngredientCautions().stream())
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        List<String> matchedDiseaseNames = items.stream()
                .flatMap(item -> item.matchedDiseaseNames().stream())
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        List<String> matchedHealthInfoNames = items.stream()
                .flatMap(item -> item.matchedHealthInfoNames().stream())
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        return new PrescriptionAnalysisResponse(
                scheduleId,
                hasWarning ? "CAUTION" : "CLEAR",
                hasWarning ? "Matched prescription caution found." : "No prescription caution matched.",
                matchedMedicineNames,
                matchedIngredientNames,
                matchedDiseaseNames,
                matchedHealthInfoNames,
                items
        );
    }

    // 약 하나에 약주의/성분주의 겹치는지 체크
    private PrescriptionAnalysisResultItem analyzeMedicine(
            MedicationScheduleMedicine scheduleMedicine,
            List<UserMedicationCaution> medicineCautions,
            List<UserMedicationCaution> ingredientCautions
    ) {
        MedicineInfo medicineInfo = resolveMedicineInfo(scheduleMedicine);
        Long medicineId = medicineInfo != null ? medicineInfo.getItemSeq() : scheduleMedicine.getMedicineId();
        String medicineName = firstText(
                medicineInfo != null ? medicineInfo.getItemName() : null,
                scheduleMedicine.getCustomMedicineName(),
                "Unknown medicine"
        );

        // 약주의 매칭 확인
        List<String> matchedMedicineCautions = medicineCautions.stream()
                .filter(caution -> matchesMedicineCaution(caution, medicineId, medicineName))
                .map(this::formatCautionTarget)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        // 성분주의 매칭 확인
        List<String> matchedIngredientCautions = findMatchedIngredientCautions(medicineId, ingredientCautions);
        // 일반 주의 태그 조회
        List<String> generalCautionTags = findGeneralCautionTags(medicineId);

        return new PrescriptionAnalysisResultItem(
                scheduleMedicine.getId(),
                medicineId,
                medicineName,
                !matchedMedicineCautions.isEmpty(),
                !matchedIngredientCautions.isEmpty(),
                false,
                false,
                matchedMedicineCautions,
                matchedIngredientCautions,
                List.of(),
                List.of(),
                generalCautionTags
        );
    }

    // FastAPI에 보낼 처방약 목록 + 사용자 건강상태/기저질환 키워드 목록을 준비해서 분석 요청
    private List<AiPrescriptionAnalysisItem> analyzeHealthAndDiseaseCautions(
            Long userId,
            Long scheduleId,
            List<PrescriptionAnalysisResultItem> items
    ) {
        // 약 목록
        List<AiPrescriptionAnalysisMedicine> medicines = items.stream()
                .filter(item -> StringUtils.hasText(item.medicineName()))
                .map(item -> new AiPrescriptionAnalysisMedicine(
                        item.scheduleMedicineId(),
                        item.medicineId(),
                        item.medicineName()
                ))
                .toList();
        if (medicines.isEmpty()) {
            return List.of();
        }

        // 사용자 건강정보
        AuthUserHealthContextResponse healthContext = getHealthContext(userId);
        if (healthContext == null) {
            return List.of();
        }

        // 매핑된 키워드 전부 list로
        List<AiPrescriptionAnalysisKeywordGroup> healthGroups = buildHealthKeywordGroups(healthContext);

        // 기저질환 전부 list로
        List<AiPrescriptionAnalysisKeywordGroup> diseaseGroups = buildDiseaseKeywordGroups(healthContext.chronicDiseases());
        if (healthGroups.isEmpty() && diseaseGroups.isEmpty()) {
            return List.of();
        }

        try {
            // fastApi에 요청
            AiPrescriptionAnalysisResponse response = aiPrescriptionAnalysisClient.analyze(
                    new AiPrescriptionAnalysisRequest(userId, scheduleId, medicines, healthGroups, diseaseGroups)
            );
            if (response == null || response.items() == null) {
                return List.of();
            }

            return response.items();
        } catch (RestClientException exception) {
            return List.of();
        }
    }

    private AuthUserHealthContextResponse getHealthContext(Long userId) {
        try {
            return authUserContextClient.getHealthContext(new AuthUserHealthContextRequest(userId));
        } catch (RestClientException exception) {
            return null;
        }
    }

    // 건강 정보를 -> 키워드들로 매핑
    private List<AiPrescriptionAnalysisKeywordGroup> buildHealthKeywordGroups(
            AuthUserHealthContextResponse healthContext
    ) {
        List<AiPrescriptionAnalysisKeywordGroup> groups = new ArrayList<>();

        if (healthContext.isPregnant()) {
            groups.add(keywordGroup("임산부", "임신", "임산부", "임부", "임신부", "임신 중"));
        }
        if (healthContext.isBreastfeeding()) {
            groups.add(keywordGroup("수유부", "수유", "수유부", "모유", "모유수유", "젖먹이"));
        }
        if (healthContext.isSmoking()) {
            groups.add(keywordGroup("흡연", "흡연", "흡연자", "담배", "니코틴"));
        }
        if (healthContext.isDrinking()) {
            groups.add(keywordGroup("음주", "음주", "술", "알코올", "주류"));
        }
        if (healthContext.isChild()) {
            groups.add(keywordGroup("소아", "소아", "어린이", "유아", "소아청소년", "영아"));
        }
        if (healthContext.isElderly()) {
            groups.add(keywordGroup("고령자", "노인", "고령자", "고령", "고령 환자", "노약자"));
        }

        return groups;
    }

    private List<AiPrescriptionAnalysisKeywordGroup> buildDiseaseKeywordGroups(List<String> chronicDiseases) {
        if (chronicDiseases == null || chronicDiseases.isEmpty()) {
            return List.of();
        }

        return chronicDiseases.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .map(diseaseName -> new AiPrescriptionAnalysisKeywordGroup(diseaseName, List.of(diseaseName)))
                .toList();
    }

    private AiPrescriptionAnalysisKeywordGroup keywordGroup(String label, String... keywords) {
        return new AiPrescriptionAnalysisKeywordGroup(label, List.of(keywords));
    }

    private PrescriptionAnalysisResultItem mergeAiAnalysis(
            PrescriptionAnalysisResultItem item,
            AiPrescriptionAnalysisItem aiItem
    ) {
        List<String> matchedDiseaseNames = aiItem != null && aiItem.matchedDiseaseNames() != null
                ? aiItem.matchedDiseaseNames()
                : Collections.emptyList();
        List<String> matchedHealthInfoNames = aiItem != null && aiItem.matchedHealthInfoNames() != null
                ? aiItem.matchedHealthInfoNames()
                : Collections.emptyList();

        return new PrescriptionAnalysisResultItem(
                item.scheduleMedicineId(),
                item.medicineId(),
                item.medicineName(),
                item.warningMedicine(),
                item.warningIngredient(),
                !matchedDiseaseNames.isEmpty(),
                !matchedHealthInfoNames.isEmpty(),
                item.matchedMedicineCautions(),
                item.matchedIngredientCautions(),
                matchedDiseaseNames,
                matchedHealthInfoNames,
                item.generalCautionTags()
        );
    }

    private List<String> findGeneralCautionTags(Long medicineId) {
        if (medicineId == null) {
            return List.of();
        }

        return medicineCautionTagRepository.findByItemSeq(medicineId).stream()
                .map(tag -> tag.getTagName())
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private MedicineInfo resolveMedicineInfo(MedicationScheduleMedicine scheduleMedicine) {
        if (scheduleMedicine.getMedicineId() != null) {
            return medicineInfoRepository.findById(scheduleMedicine.getMedicineId()).orElse(null);
        }

        if (!StringUtils.hasText(scheduleMedicine.getCustomMedicineName())) {
            return null;
        }

        return medicineInfoRepository.findByItemName(scheduleMedicine.getCustomMedicineName()).orElse(null);
    }

    private boolean matchesMedicineCaution(UserMedicationCaution caution, Long medicineId, String medicineName) {
        if (caution.getItemSeq() != null && Objects.equals(caution.getItemSeq(), medicineId)) {
            return true;
        }

        return namesOverlap(caution.getItemName(), medicineName);
    }

    private List<String> findMatchedIngredientCautions(
            Long medicineId,
            List<UserMedicationCaution> ingredientCautions
    ) {
        if (medicineId == null || ingredientCautions.isEmpty()) {
            return List.of();
        }

        List<MedicineIngredient> ingredients = medicineIngredientRepository.findByItemSeq(medicineId);
        if (ingredients.isEmpty()) {
            return List.of();
        }

        Set<String> matchedTargets = new LinkedHashSet<>();
        for (MedicineIngredient ingredient : ingredients) {
            for (UserMedicationCaution caution : ingredientCautions) {
                if (matchesIngredientCaution(caution, ingredient)) {
                    matchedTargets.add(formatCautionTarget(caution));
                }
            }
        }

        return matchedTargets.stream()
                .filter(StringUtils::hasText)
                .toList();
    }

    private boolean matchesIngredientCaution(UserMedicationCaution caution, MedicineIngredient ingredient) {
        if (StringUtils.hasText(caution.getIngredientCode())
                && caution.getIngredientCode().equals(ingredient.getIngredientCode())) {
            return true;
        }

        return namesOverlap(caution.getIngredientName(), ingredient.getIngredientName());
    }

    private boolean namesOverlap(String left, String right) {
        String normalizedLeft = normalizeName(left);
        String normalizedRight = normalizeName(right);

        if (!StringUtils.hasText(normalizedLeft) || !StringUtils.hasText(normalizedRight)) {
            return false;
        }

        return normalizedLeft.equals(normalizedRight)
                || normalizedLeft.contains(normalizedRight)
                || normalizedRight.contains(normalizedLeft);
    }

    private String normalizeName(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        return value.toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "")
                .replaceAll("[()\\[\\]{}]", "");
    }

    private String formatCautionTarget(UserMedicationCaution caution) {
        return firstText(
                caution.getIngredientName(),
                caution.getItemName(),
                caution.getIngredientCode(),
                caution.getItemSeq() != null ? String.valueOf(caution.getItemSeq()) : null
        );
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }

        return "";
    }
}
