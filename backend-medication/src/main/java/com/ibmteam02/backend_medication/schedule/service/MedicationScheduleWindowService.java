package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationScheduleWindowService {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;

    // 스케쥴 하나 기준으로 전부 계산
    public List<MedicationScheduleMedicine> recalculateSchedule(MedicationSchedule schedule) {
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(schedule.getId());

        for (MedicationScheduleMedicine medicine : medicines) {
            recalculateMedicineWindow(schedule, medicine);
        }

        syncScheduleActivity(schedule, medicines);
        medicationScheduleRepository.save(schedule);
        return medicines;
    }

    // 약 하나만 다시 계산
    public void recalculateMedicine(MedicationScheduleMedicine medicine) {
        MedicationSchedule schedule = medicine.getMedicationSchedule();

        recalculateMedicineWindow(schedule, medicine);

        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(schedule.getId());
        syncScheduleActivity(schedule, medicines);
        medicationScheduleRepository.save(schedule);
    }

    // 약 하나에 대새 기준시각으로부터 시작일, 종료일 계싼
    private void recalculateMedicineWindow(
            MedicationSchedule schedule,
            MedicationScheduleMedicine medicine
    ) {
        List<MedicationScheduleTime> scheduleTimes =
                medicationScheduleTimeRepository.findByMedicationScheduleMedicineIdOrderBySortOrderAsc(medicine.getId());
        LocalDateTime referenceTime = resolveReferenceTime(schedule, medicine);
        LocalDate startDate = calculateStartDate(referenceTime, scheduleTimes, medicine.getStartDate());
        int durationDays = normalizeDurationDays(medicine.getDurationDays());
        LocalDate endDate = calculateEndDate(medicine, scheduleTimes, referenceTime, startDate, durationDays);

        medicine.updateScheduleWindow(startDate, endDate, isActive(endDate));
    }

    // 오늘 조제/등록이면 실제 등록시각 기준
    // 과거/미래 조제일이면 그 날짜 0시 기준
    private LocalDateTime resolveReferenceTime(
            MedicationSchedule schedule,
            MedicationScheduleMedicine medicine
    ) {
        LocalDateTime createdAt = medicine.getCreatedAt() != null
                ? medicine.getCreatedAt()
                : schedule.getCreatedAt() != null
                ? schedule.getCreatedAt()
                : LocalDateTime.now(SCHEDULE_ZONE);

        LocalDate anchorDate = schedule.getDispensedDate() != null
                ? schedule.getDispensedDate()
                : medicine.getStartDate();

        if (anchorDate != null && !anchorDate.isEqual(createdAt.toLocalDate())) {
            return anchorDate.atStartOfDay();
        }

        if (medicine.getStartDate() != null && medicine.getStartDate().isAfter(createdAt.toLocalDate())) {
            return medicine.getStartDate().atStartOfDay();
        }

        return createdAt;
    }

    // 첫 복용 날짜 계산
    private LocalDate calculateStartDate(
            LocalDateTime referenceTime,
            List<MedicationScheduleTime> scheduleTimes,
            LocalDate fallbackStartDate
    ) {
        if (scheduleTimes.isEmpty()) {
            return fallbackStartDate != null ? fallbackStartDate : referenceTime.toLocalDate();
        }

        return scheduleTimes.stream()
                .map(MedicationScheduleTime::getTakeTime)
                .sorted()
                .filter(takeTime -> !takeTime.isBefore(referenceTime.toLocalTime()))
                .findFirst()
                .map(ignored -> referenceTime.toLocalDate())
                .orElseGet(() -> referenceTime.toLocalDate().plusDays(1L));
    }

    // 마지막 복용 날짜 계산
    private LocalDate calculateEndDate(
            MedicationScheduleMedicine medicine,
            List<MedicationScheduleTime> scheduleTimes,
            LocalDateTime referenceTime,
            LocalDate startDate,
            int durationDays
    ) {
        int totalDailySlots = !scheduleTimes.isEmpty()
                ? scheduleTimes.size()
                : Math.max(medicine.getTimesPerDay() != null ? medicine.getTimesPerDay() : 1, 1);
        int totalDoseCount = durationDays * totalDailySlots;
        int firstDayDoseCount = calculateFirstDayDoseCount(scheduleTimes, referenceTime, startDate);

        int remainingDoses = totalDoseCount;
        LocalDate cursor = startDate;

        while (remainingDoses > 0) {
            int availableToday = cursor.equals(startDate) ? firstDayDoseCount : totalDailySlots;
            int consumedToday = Math.min(remainingDoses, Math.max(availableToday, 1));
            remainingDoses -= consumedToday;

            if (remainingDoses > 0) {
                cursor = cursor.plusDays(1L);
            }
        }

        return cursor;
    }

    // 첫날에 실제 몇번 먹어야 하는지
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

    // 약이 하나라도 활성상태면 스케쥴도 활성 상태 (isActive)
    private void syncScheduleActivity(MedicationSchedule schedule, List<MedicationScheduleMedicine> medicines) {
        boolean active = medicines.isEmpty()
                || medicines.stream().anyMatch(medicine -> Boolean.TRUE.equals(medicine.getIsActive()));

        schedule.update(
                schedule.getUserId(),
                schedule.getHospitalName(),
                schedule.getPharmacyName(),
                schedule.getDispensedDate(),
                active
        );
    }

    private int normalizeDurationDays(Integer durationDays) {
        if (durationDays == null || durationDays < 1) {
            return 1;
        }
        return durationDays;
    }

    private boolean isActive(LocalDate endDate) {
        LocalDate today = LocalDate.now(SCHEDULE_ZONE);
        return !endDate.isBefore(today);
    }
}
