package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import com.ibmteam02.backend_medication.caution.repository.UserMedicationCautionRepository;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.repository.MedicationIntakeLogRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineChatbotContextService {

    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final MedicationIntakeLogRepository medicationIntakeLogRepository;
    private final UserMedicationCautionRepository userMedicationCautionRepository;

    // llm에게 넘겨줄 db 조회 정보들을 빌드
    @Transactional(readOnly = true)
    public String buildChatbotContext(Long userId, List<String> extractedNames, List<String> requestDetails) {
        boolean requestedMedicineInfo = hasAnyDetail(
                requestDetails,
                "EFFICACY",
                "USE_METHOD",
                "STORAGE_METHOD",
                "CAUTION_WARNING",
                "INGREDIENT"
        );
        boolean requestedMyMedicationStatus = hasAnyDetail(
                requestDetails,
                "MEDICATION_RECORD",
                "MEDICATION_SCHEDULE",
                "CURRENT_MEDICATION"
        );
        boolean requestedContraindicationCheck = hasAnyDetail(requestDetails, "CONTRAINDICATION_MATCH");
        boolean requestedInteractionCheck = hasAnyDetail(requestDetails, "INTERACTION_RISK");

        List<MedicineInfo> mentionedMedicineInfos = List.of();
        if (requiresMentionedMedicines(requestedMedicineInfo, requestedContraindicationCheck, requestedInteractionCheck)
                && extractedNames != null
                && !extractedNames.isEmpty()) {
            mentionedMedicineInfos = medicineInfoRepository.findByItemNameIn(extractedNames);
        }

        StringBuilder result = new StringBuilder();

        // 약 관련 세부 요청이 들어왔으면 appendMedicineInfoContext()
        if (requestedMedicineInfo) {
            appendMedicineInfoContext(result, mentionedMedicineInfos, requestDetails);
        }

        // 약 관련 세부 요청이 들어왔으면 appendMyMedicationStatusContext()
        if (requestedMyMedicationStatus) {
            appendMyMedicationStatusContext(result, userId, requestDetails);
        }

        // 내 주의 약/성분과 질문 약을 대조
        if (requestedContraindicationCheck) {
            appendSafetyContraindicationContext(result, userId, mentionedMedicineInfos);
        }

        // 질문 약 성분과 현재 복용 중 약 성분/상호작용 문구를 대조
        if (requestedInteractionCheck) {
            appendSafetyInteractionContext(result, userId, mentionedMedicineInfos);
        }

        if (result.length() == 0
                && requiresMentionedMedicines(requestedMedicineInfo, requestedContraindicationCheck, requestedInteractionCheck)
                && (extractedNames == null || extractedNames.isEmpty())) {
            return "약 이름을 찾지 못했어요.";
        }

        if (result.length() == 0
                && requiresMentionedMedicines(requestedMedicineInfo, requestedContraindicationCheck, requestedInteractionCheck)
                && mentionedMedicineInfos.isEmpty()) {
            return "해당 약 정보를 찾지 못했어요.";
        }

        if (result.length() == 0) {
            return "요청한 정보를 아직 지원하지 않아요.";
        }

        return result.toString().trim();
    }

    // 약 관련 세부 요청이 들어왔으면
    private void appendMedicineInfoContext(
            StringBuilder result,
            List<MedicineInfo> medicineInfos,
            List<String> requestDetails
    ) {
        if (medicineInfos == null || medicineInfos.isEmpty()) {
            result.append("약 정보 컨텍스트를 찾지 못했어요.\n\n");
            return;
        }

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
                            .map(medicine -> medicine.getItemName() + ": " + formatIngredientSummary(medicine.getItemSeq()))
                            .collect(Collectors.joining("\n"))
            ).append("\n\n");
        }
    }

    // 내 복약 일정/복약 기록이 필요한 질문이면
    private void appendMyMedicationStatusContext(StringBuilder result, Long userId, List<String> requestDetails) {
        result.append("[내 복약 정보]\n");

        if (userId == null) {
            result.append("로그인 사용자 정보를 확인할 수 없어 내 복약 정보는 조회하지 못했어요.\n\n");
            return;
        }

        List<MedicationSchedule> schedules = medicationScheduleRepository.findByUserId(userId);
        if (schedules.isEmpty()) {
            result.append("등록된 복약 일정이 없습니다.\n\n");
            return;
        }

        Map<Long, List<MedicationScheduleTime>> scheduleTimesMap = buildScheduleTimesMap(schedules);
        Map<Long, List<MedicationIntakeLog>> intakeLogMap = buildIntakeLogMap(schedules);

        LocalDate today = LocalDate.now();

        if (requestDetails != null && requestDetails.contains("CURRENT_MEDICATION")) {
            List<MedicationSchedule> currentSchedules = schedules.stream()
                    .filter(schedule -> isActiveToday(schedule, today))
                    .toList();

            result.append("- 현재 복용 중인 약\n");
            if (currentSchedules.isEmpty()) {
                result.append("현재 복용 중인 약이 없습니다.\n");
            } else {
                for (MedicationSchedule schedule : currentSchedules) {
                    result.append("• ")
                            .append(formatScheduleName(schedule))
                            .append(" / 복용 시간: ")
                            .append(formatScheduleTimes(scheduleTimesMap.get(schedule.getId())))
                            .append("\n");
                }
            }
            result.append("\n");
        }

        if (requestDetails != null && requestDetails.contains("MEDICATION_SCHEDULE")) {
            result.append("- 등록된 복약 일정\n");
            for (MedicationSchedule schedule : schedules) {
                result.append("• ")
                        .append(formatScheduleName(schedule))
                        .append(" / 기간: ")
                        .append(schedule.getStartDate())
                        .append(" ~ ")
                        .append(schedule.getEndDate())
                        .append(" / 시간: ")
                        .append(formatScheduleTimes(scheduleTimesMap.get(schedule.getId())))
                        .append("\n");
            }
            result.append("\n");
        }

        if (requestDetails != null && requestDetails.contains("MEDICATION_RECORD")) {
            List<MedicationIntakeLog> recentLogs = schedules.stream()
                    .flatMap(schedule -> intakeLogMap.getOrDefault(schedule.getId(), List.of()).stream())
                    .sorted(Comparator.comparing(this::logSortBaseTime).reversed())
                    .limit(5)
                    .toList();

            result.append("- 최근 복약 기록\n");
            if (recentLogs.isEmpty()) {
                result.append("최근 복약 기록이 없습니다.\n");
            } else {
                for (MedicationIntakeLog log : recentLogs) {
                    result.append("• ")
                            .append(formatScheduleName(log.getMedicationSchedule()))
                            .append(" / 상태: ")
                            .append(log.getStatus())
                            .append(" / 예정 시각: ")
                            .append(log.getScheduledAt())
                            .append(" / 복용 시각: ")
                            .append(log.getTakenAt() != null ? log.getTakenAt() : "미기록")
                            .append("\n");
                }
            }
            result.append("\n");
        }
    }

    // 내 주의 약/성분과 질문 약의 성분/약명을 대조
    private void appendSafetyContraindicationContext(
            StringBuilder result,
            Long userId,
            List<MedicineInfo> mentionedMedicineInfos
    ) {
        result.append("[금기/주의 성분 체크]\n");

        if (userId == null) {
            result.append("로그인 사용자 정보가 없어 개인 주의 약/성분은 조회하지 못했어요.\n\n");
            return;
        }

        List<UserMedicationCaution> cautions = userMedicationCautionRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        if (cautions.isEmpty()) {
            result.append("등록된 주의 약/성분이 없습니다.\n\n");
            return;
        }

        if (mentionedMedicineInfos == null || mentionedMedicineInfos.isEmpty()) {
            result.append("질문한 약 이름이 없어 금기 여부를 대조하지 못했어요.\n\n");
            return;
        }

        List<String> matchedItems = new ArrayList<>();

        for (MedicineInfo medicineInfo : mentionedMedicineInfos) {
            Set<String> ingredientNames = extractIngredientNames(medicineInfo.getItemSeq());
            Set<String> ingredientCodes = extractIngredientCodes(medicineInfo.getItemSeq());

            for (UserMedicationCaution caution : cautions) {
                boolean matchedByMedicine = caution.getItemSeq() != null && caution.getItemSeq().equals(medicineInfo.getItemSeq());
                boolean matchedByMedicineName = caution.getItemName() != null
                        && caution.getItemName().equalsIgnoreCase(medicineInfo.getItemName());
                boolean matchedByIngredientName = caution.getIngredientName() != null
                        && ingredientNames.contains(caution.getIngredientName());
                boolean matchedByIngredientCode = caution.getIngredientCode() != null
                        && ingredientCodes.contains(caution.getIngredientCode());

                if (matchedByMedicine || matchedByMedicineName || matchedByIngredientName || matchedByIngredientCode) {
                    matchedItems.add(
                            medicineInfo.getItemName()
                                    + " ↔ 주의 항목("
                                    + formatCautionTarget(caution)
                                    + ", 사유: "
                                    + caution.getReason()
                                    + ")"
                    );
                }
            }
        }

        if (matchedItems.isEmpty()) {
            result.append("질문한 약과 직접 일치하는 주의 약/성분은 발견되지 않았어요.\n");
        } else {
            result.append("질문한 약과 사용자 주의 항목이 일치할 수 있어요.\n");
            matchedItems.forEach(item -> result.append("• ").append(item).append("\n"));
        }

        // 사용자 건강 상태(user_profile_health), 질환(user_chronic_disease)은 현재 auth 서버 소유 데이터라
        // medication 서버 단독으로는 아직 조회하지 못한다.
        result.append("\n");
    }

    // 질문 약 성분과 현재 복용 중인 약 성분 / 상호작용 문구를 비교
    private void appendSafetyInteractionContext(
            StringBuilder result,
            Long userId,
            List<MedicineInfo> mentionedMedicineInfos
    ) {
        result.append("[상호작용 체크]\n");

        if (mentionedMedicineInfos == null || mentionedMedicineInfos.isEmpty()) {
            result.append("질문한 약 이름이 없어 상호작용 여부를 확인하지 못했어요.\n\n");
            return;
        }

        Map<Long, MedicineInfo> currentMedicationInfoMap = loadCurrentMedicationInfoMap(userId);
        Set<String> currentIngredientNames = currentMedicationInfoMap.values().stream()
                .flatMap(info -> extractIngredientNames(info.getItemSeq()).stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (userId == null) {
            result.append("로그인 사용자 정보가 없어 현재 복용 중인 약과의 비교는 생략했어요.\n");
        } else if (currentMedicationInfoMap.isEmpty()) {
            result.append("현재 복용 중인 약 정보가 없어 질문 약 자체의 상호작용 문구만 참고했어요.\n");
        }

        for (MedicineInfo medicineInfo : mentionedMedicineInfos) {
            Set<String> mentionedIngredientNames = extractIngredientNames(medicineInfo.getItemSeq());
            Set<String> duplicatedIngredients = new LinkedHashSet<>(mentionedIngredientNames);
            duplicatedIngredients.retainAll(currentIngredientNames);

            result.append("• ").append(medicineInfo.getItemName()).append("\n");
            result.append("  - 질문 약 성분: ")
                    .append(mentionedIngredientNames.isEmpty() ? "성분 정보 없음" : String.join(", ", mentionedIngredientNames))
                    .append("\n");

            if (!duplicatedIngredients.isEmpty()) {
                result.append("  - 현재 복용 중인 약과 겹치는 성분: ")
                        .append(String.join(", ", duplicatedIngredients))
                        .append("\n");
            } else if (!currentMedicationInfoMap.isEmpty()) {
                result.append("  - 현재 복용 중인 약과 겹치는 성분은 확인되지 않았어요.\n");
            }

            result.append("  - 약 정보 상 상호작용 문구: ")
                    .append(nullToDefault(medicineInfo.getInteraction()))
                    .append("\n");
        }

        result.append("\n");
    }

    // requestDetails 안에 특정 상세 요청값이 들어있는지
    private boolean hasAnyDetail(List<String> requestDetails, String... targets) {
        if (requestDetails == null || requestDetails.isEmpty()) {
            return false;
        }

        for (String target : targets) {
            if (requestDetails.contains(target)) {
                return true;
            }
        }
        return false;
    }

    // 복약 일정이 오늘 기준으로 유효한 상태인지 (isActiveToday)
    private boolean isActiveToday(MedicationSchedule schedule, LocalDate today) {
        if (schedule.getStartDate() == null || schedule.getEndDate() == null) {
            return Boolean.TRUE.equals(schedule.getIsActive());
        }
        return !today.isBefore(schedule.getStartDate()) && !today.isAfter(schedule.getEndDate());
    }

    // 이 복약 일정의 이름을 뭐라고 보여줄지 정하는 함수 (약 이름 우선)
    private String formatScheduleName(MedicationSchedule schedule) {
        if (schedule.getCustomMedicineName() != null && !schedule.getCustomMedicineName().isBlank()) {
            return schedule.getCustomMedicineName();
        }
        if (schedule.getMedicineId() != null) {
            return "약 ID " + schedule.getMedicineId();
        }
        return "이름 없는 복약 일정";
    }

    // 복약 시간 목록을 사람이 읽기 쉬운 문자열로 변환
    private String formatScheduleTimes(List<MedicationScheduleTime> scheduleTimes) {
        if (scheduleTimes == null || scheduleTimes.isEmpty()) {
            return "등록된 복용 시간 없음";
        }

        List<String> labels = new ArrayList<>();
        for (MedicationScheduleTime scheduleTime : scheduleTimes) {
            labels.add(scheduleTime.getTakeTime() + "(" + scheduleTime.getTiming() + ")");
        }
        return String.join(", ", labels);
    }

    // 복약 기록을 최신순 정렬할 때 기준이 되는 시간
    private LocalDateTime logSortBaseTime(MedicationIntakeLog log) {
        if (log.getScheduledAt() != null) {
            return log.getScheduledAt();
        }
        if (log.getTakenAt() != null) {
            return log.getTakenAt();
        }
        return log.getCreatedAt();
    }

    // 이번 질문이 질문한 약 이름을 꼭 필요로 하는 질문인지
    private boolean requiresMentionedMedicines(
            boolean requestedMedicineInfo,
            boolean requestedContraindicationCheck,
            boolean requestedInteractionCheck
    ) {
        return requestedMedicineInfo || requestedContraindicationCheck || requestedInteractionCheck;
    }

    // 각 복약 일정 ID별로 복용 시간 목록을 모아 Map으로
    private Map<Long, List<MedicationScheduleTime>> buildScheduleTimesMap(List<MedicationSchedule> schedules) {
        Map<Long, List<MedicationScheduleTime>> scheduleTimesMap = new HashMap<>();
        for (MedicationSchedule schedule : schedules) {
            scheduleTimesMap.put(
                    schedule.getId(),
                    medicationScheduleTimeRepository.findByMedicationScheduleIdOrderBySortOrderAsc(schedule.getId())
            );
        }
        return scheduleTimesMap;
    }

    // 각 복약 일정 ID별로 복약 기록 목록을 모아 Map으로
    private Map<Long, List<MedicationIntakeLog>> buildIntakeLogMap(List<MedicationSchedule> schedules) {
        Map<Long, List<MedicationIntakeLog>> intakeLogMap = new HashMap<>();
        for (MedicationSchedule schedule : schedules) {
            intakeLogMap.put(
                    schedule.getId(),
                    medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(schedule.getId())
            );
        }
        return intakeLogMap;
    }

    // 특정 약의 성분 목록을 한 줄 문자열로
    private String formatIngredientSummary(Long itemSeq) {
        List<MedicineIngredient> ingredients = medicineIngredientRepository.findByItemSeq(itemSeq);
        if (ingredients.isEmpty()) {
            return "성분 정보가 없습니다.";
        }

        return ingredients.stream()
                .map(ingredient -> ingredient.getIngredientName()
                        + " " + nullToDefault(ingredient.getQuantity())
                        + nullToDefault(ingredient.getUnit()))
                .collect(Collectors.joining(", "));
    }

    // 특정 약의 성분명들만 Set으로
    private Set<String> extractIngredientNames(Long itemSeq) {
        return medicineIngredientRepository.findByItemSeq(itemSeq).stream()
                .map(MedicineIngredient::getIngredientName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    // 특정 약의 성분 코드들만 Set으로
    private Set<String> extractIngredientCodes(Long itemSeq) {
        return medicineIngredientRepository.findByItemSeq(itemSeq).stream()
                .map(MedicineIngredient::getIngredientCode)
                .filter(code -> code != null && !code.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    // 사용자 주의 항목을 사람이 읽을 수 있는 이름으로
    private String formatCautionTarget(UserMedicationCaution caution) {
        if (caution.getIngredientName() != null && !caution.getIngredientName().isBlank()) {
            return caution.getIngredientName();
        }
        if (caution.getItemName() != null && !caution.getItemName().isBlank()) {
            return caution.getItemName();
        }
        if (caution.getIngredientCode() != null && !caution.getIngredientCode().isBlank()) {
            return "성분코드 " + caution.getIngredientCode();
        }
        if (caution.getItemSeq() != null) {
            return "약 ID " + caution.getItemSeq();
        }
        return "이름 없는 주의 항목";
    }

    // 현재 복용 중인 약 스케줄을 조회해서, 그 약들의 MedicineInfo를 Map으로 모음
    private Map<Long, MedicineInfo> loadCurrentMedicationInfoMap(Long userId) {
        if (userId == null) {
            return Map.of();
        }

        LocalDate today = LocalDate.now();
        List<MedicationSchedule> currentSchedules = medicationScheduleRepository.findByUserId(userId).stream()
                .filter(schedule -> isActiveToday(schedule, today))
                .filter(schedule -> schedule.getMedicineId() != null)
                .toList();

        Set<Long> medicineIds = currentSchedules.stream()
                .map(MedicationSchedule::getMedicineId)
                .collect(Collectors.toCollection(HashSet::new));

        if (medicineIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, MedicineInfo> infoMap = new LinkedHashMap<>();
        for (MedicineInfo medicineInfo : medicineInfoRepository.findAllById(medicineIds)) {
            infoMap.put(medicineInfo.getItemSeq(), medicineInfo);
        }
        return infoMap;
    }

    private String nullToDefault(String value) {
        if (value == null || value.isBlank()) {
            return "정보가 없습니다.";
        }
        return value;
    }
}
