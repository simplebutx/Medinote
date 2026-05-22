package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationScheduleService {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;

    // 복약 일정 생성 + 기본 시작일/종료일 계산해서 저장
    public MedicationScheduleResponse create(Long userId, MedicationScheduleRequest request) {
        LocalDate initialStartDate = LocalDate.now(SCHEDULE_ZONE);
        int durationDays = normalizeDurationDays(request.durationDays());

        MedicationSchedule schedule = MedicationSchedule.builder()
                .userId(userId)
                .medicineId(request.medicineId())
                .customMedicineName(request.customMedicineName())
                .hospitalName(request.hospitalName())
                .pharmacyName(request.pharmacyName())
                .dosageAmount(request.dosageAmount())
                .dosageUnit(request.dosageUnit())
                .frequencyType(request.frequencyType())
                .timesPerDay(request.timesPerDay())
                .intervalHours(request.intervalHours())
                .durationDays(durationDays)
                .startDate(initialStartDate)
                .endDate(initialStartDate.plusDays(durationDays - 1L))
                .prescribedDate(request.prescribedDate())
                .dispensedDate(request.dispensedDate())
                .isActive(Boolean.TRUE)
                .build();

        return toResponse(medicationScheduleRepository.save(schedule));
    }

    // ID로 복약 일정 1건을 조회
    @Transactional(readOnly = true)
    public MedicationScheduleResponse getDetail(Long userId, Long id) {
        MedicationSchedule medicationSchedule = findById(id);

        if (!medicationSchedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return toResponse(medicationSchedule);
    }

    // 특정 사용자의 복약 일정 목록을 조회
    @Transactional(readOnly = true)
    public List<MedicationScheduleResponse> getList(Long userId) {
        return medicationScheduleRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // 기존 계산된 시작일은 유지한 채 수정 가능한 복약 일정 정보만 변경
    public MedicationScheduleResponse update(Long userId, Long id, MedicationScheduleRequest request) {
        MedicationSchedule schedule = findById(id);

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        LocalDate startDate = schedule.getStartDate() != null ? schedule.getStartDate() : LocalDate.now(SCHEDULE_ZONE);
        int durationDays = normalizeDurationDays(request.durationDays());
        LocalDate endDate = startDate.plusDays(durationDays - 1L);

        schedule.update(
                userId,
                request.medicineId(),
                request.customMedicineName(),
                request.hospitalName(),
                request.pharmacyName(),
                request.dosageAmount(),
                request.dosageUnit(),
                request.frequencyType(),
                request.timesPerDay(),
                request.intervalHours(),
                durationDays,
                startDate,
                endDate,
                request.prescribedDate(),
                request.dispensedDate(),
                isActive(endDate)
        );

        return toResponse(schedule);
    }

    // 등록 시각과 저장된 복용 시간대를 기준으로 실제 복용 시작일과 종료일을 계산
    public MedicationScheduleResponse initializeScheduleWindow(Long userId, Long id) {
        MedicationSchedule medicationSchedule = findById(id);

        if (!medicationSchedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        List<MedicationScheduleTime> scheduleTimes = medicationScheduleTimeRepository
                .findByMedicationScheduleIdOrderBySortOrderAsc(id);

        LocalDateTime referenceTime = medicationSchedule.getCreatedAt() != null
                ? medicationSchedule.getCreatedAt().atOffset(ZoneOffset.UTC).atZoneSameInstant(SCHEDULE_ZONE).toLocalDateTime()
                : LocalDateTime.now(SCHEDULE_ZONE);
        LocalDate startDate = calculateStartDate(referenceTime, scheduleTimes);
        LocalDate endDate = calculateEndDate(medicationSchedule, scheduleTimes, referenceTime, startDate);

        medicationSchedule.updateScheduleWindow(startDate, endDate, isActive(endDate));
        return toResponse(medicationScheduleRepository.saveAndFlush(medicationSchedule));
    }

    // 복약 일정 1건을 삭제
    public void delete(Long userId, Long id) {
        MedicationSchedule medicationSchedule = findById(id);

        if (!medicationSchedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        medicationScheduleRepository.delete(medicationSchedule);
    }

    // 복약 일정을 조회하고 없으면 예외를 발생
    private MedicationSchedule findById(Long id) {
        return medicationScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));
    }

    // 엔티티를 클라이언트 응답용 DTO로 변환
    private MedicationScheduleResponse toResponse(MedicationSchedule schedule) {
        return new MedicationScheduleResponse(
                schedule.getId(),
                schedule.getUserId(),
                schedule.getMedicineId(),
                schedule.getCustomMedicineName(),
                schedule.getHospitalName(),
                schedule.getPharmacyName(),
                schedule.getDosageAmount(),
                schedule.getDosageUnit(),
                schedule.getFrequencyType(),
                schedule.getTimesPerDay(),
                schedule.getIntervalHours(),
                schedule.getDurationDays(),
                schedule.getStartDate(),
                schedule.getEndDate(),
                schedule.getPrescribedDate(),
                schedule.getDispensedDate(),
                schedule.getIsActive(),
                schedule.getCreatedAt(),
                schedule.getUpdatedAt()
        );
    }

    // 복용일수가 비어 있거나 0 이하로 들어오면 1로 보정
    private int normalizeDurationDays(Integer durationDays) {
        if (durationDays == null || durationDays < 1) {
            return 1;
        }
        return durationDays;
    }

    // 실제 복용 시작일 계산 (업로드 시각 기준)
    private LocalDate calculateStartDate(LocalDateTime referenceTime, List<MedicationScheduleTime> scheduleTimes) {
        if (scheduleTimes.isEmpty()) {
            return referenceTime.toLocalDate();
        }

        return scheduleTimes.stream()
                .map(MedicationScheduleTime::getTakeTime)
                .sorted()
                .filter(takeTime -> !takeTime.isBefore(referenceTime.toLocalTime()))
                .findFirst()
                .map(ignored -> referenceTime.toLocalDate())
                .orElseGet(() -> referenceTime.toLocalDate().plusDays(1));
    }

    // 실제 복용 종료일 계산
    private LocalDate calculateEndDate(
            MedicationSchedule schedule,
            List<MedicationScheduleTime> scheduleTimes,
            LocalDateTime referenceTime,
            LocalDate startDate
    ) {
        int totalDailySlots = !scheduleTimes.isEmpty()
                ? scheduleTimes.size()
                : Math.max(schedule.getTimesPerDay() != null ? schedule.getTimesPerDay() : 1, 1);
        int totalDoseCount = normalizeDurationDays(schedule.getDurationDays()) * totalDailySlots;
        int firstDayDoseCount = calculateFirstDayDoseCount(scheduleTimes, referenceTime, startDate);

        int remainingDoses = totalDoseCount;
        LocalDate cursor = startDate;

        while (remainingDoses > 0) {
            int availableToday = cursor.equals(startDate) ? firstDayDoseCount : totalDailySlots;
            int consumedToday = Math.min(remainingDoses, Math.max(availableToday, 1));
            remainingDoses -= consumedToday;

            if (remainingDoses > 0) {
                cursor = cursor.plusDays(1);
            }
        }

        return cursor;
    }

    // 첫날 실제로 먹을 수 있는 복용 횟수 계산
    private int calculateFirstDayDoseCount(
            List<MedicationScheduleTime> scheduleTimes,
            LocalDateTime referenceTime,
            LocalDate startDate
    ) {
        if (scheduleTimes.isEmpty()) {
            return 1;
        }

        if (startDate.isAfter(referenceTime.toLocalDate())) {
            return scheduleTimes.size();
        }

        long remainingSlots = scheduleTimes.stream()
                .map(MedicationScheduleTime::getTakeTime)
                .filter(takeTime -> !takeTime.isBefore(referenceTime.toLocalTime()))
                .count();

        return Math.max((int) remainingSlots, 1);
    }

    // 지금 이 일정이 아직 진행 중인지
    private boolean isActive(LocalDate endDate) {
        LocalDate today = LocalDate.now(SCHEDULE_ZONE);
        return endDate.isAfter(today) || endDate.isEqual(today);
    }
}
