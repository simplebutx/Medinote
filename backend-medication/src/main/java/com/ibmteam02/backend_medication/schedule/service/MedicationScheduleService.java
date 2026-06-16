package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.notification.service.MedicationNotificationService;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.DailyMedicationItemResponse;
import com.ibmteam02.backend_medication.schedule.dto.DailyMedicationResponse;
import com.ibmteam02.backend_medication.schedule.dto.DailyMedicationTimeGroupResponse;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleMedicineRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleMedicineResponse;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.repository.MedicationIntakeLogRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationScheduleService {

    private static final java.time.ZoneId SCHEDULE_ZONE = java.time.ZoneId.of("Asia/Seoul");

    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final MedicationIntakeLogRepository medicationIntakeLogRepository;
    private final MedicationScheduleWindowService medicationScheduleWindowService;
    private final MedicationNotificationService medicationNotificationService;

    // 복약 일정 등록
    public MedicationScheduleResponse create(Long userId, MedicationScheduleRequest request) {
        MedicationSchedule schedule = medicationScheduleRepository.save(MedicationSchedule.builder()
                .userId(userId)
                .hospitalName(request.hospitalName())
                .pharmacyName(request.pharmacyName())
                .dispensedDate(request.dispensedDate())
                .isActive(Boolean.TRUE)
                .build());

        List<MedicationScheduleMedicine> medicines = saveMedicines(schedule, request);
        medicines = medicationScheduleWindowService.recalculateSchedule(schedule);
        medicationNotificationService.syncMedicationReminders(schedule);

        return toResponse(schedule, medicines);
    }

    // 복약 일정 조회
    @Transactional(readOnly = true)
    public MedicationScheduleResponse getDetail(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);
        return toResponse(schedule);
    }

    // 복약 일정 목록 조회
    @Transactional(readOnly = true)
    public Page<MedicationScheduleResponse> getList(Long userId, Pageable pageable) {
        return medicationScheduleRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    // 선택한 날짜 기준으로 복약 일정 조회
    @Transactional(readOnly = true)
    public DailyMedicationResponse getDailyMedications(Long userId, LocalDate date) {
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationSchedule_UserIdOrderByIdAsc(userId).stream()
                        .filter(medicine -> isScheduledOnDate(medicine, date))
                        .toList();

        if (medicines.isEmpty()) {
            return new DailyMedicationResponse(date, List.of());
        }

        List<Long> scheduleMedicineIds = medicines.stream()
                .map(MedicationScheduleMedicine::getId)
                .toList();
        List<Long> scheduleIds = medicines.stream()
                .map(medicine -> medicine.getMedicationSchedule().getId())
                .distinct()
                .toList();

        Map<Long, MedicationScheduleMedicine> medicineById = medicines.stream()
                .collect(java.util.stream.Collectors.toMap(MedicationScheduleMedicine::getId, medicine -> medicine));
        Map<Long, MedicationIntakeLog> intakeLogByScheduleTimeId = buildIntakeLogByScheduleTimeId(scheduleIds, date);
        Map<LocalTime, List<DailyMedicationItemResponse>> groups = new LinkedHashMap<>();

        for (MedicationScheduleTime scheduleTime :
                medicationScheduleTimeRepository.findByMedicationScheduleMedicineIdInOrderByTakeTimeAscSortOrderAsc(scheduleMedicineIds)) {
            MedicationScheduleMedicine medicine = medicineById.get(scheduleTime.getMedicationScheduleMedicine().getId());
            if (medicine == null) {
                continue;
            }

            MedicationSchedule schedule = medicine.getMedicationSchedule();
            MedicationIntakeLog intakeLog = intakeLogByScheduleTimeId.get(scheduleTime.getId());

            groups.computeIfAbsent(scheduleTime.getTakeTime(), ignored -> new ArrayList<>())
                    .add(new DailyMedicationItemResponse(
                            schedule.getId(),
                            medicine.getId(),
                            scheduleTime.getId(),
                            intakeLog != null ? intakeLog.getId() : null,
                            medicine.getMedicineId(),
                            medicine.getCustomMedicineName(),
                            medicine.getDosageAmount(),
                            medicine.getDosageUnit(),
                            medicine.getTimesPerDay(),
                            scheduleTime.getTiming(),
                            scheduleTime.getTakeTime(),
                            intakeLog != null ? intakeLog.getStatus() : null,
                            intakeLog != null ? intakeLog.getScheduledAt() : date.atTime(scheduleTime.getTakeTime()),
                            intakeLog != null ? intakeLog.getTakenAt() : null,
                            schedule.getHospitalName(),
                            schedule.getPharmacyName()
                    ));
        }

        List<DailyMedicationTimeGroupResponse> timeGroups = groups.entrySet().stream()
                .map(entry -> new DailyMedicationTimeGroupResponse(entry.getKey(), entry.getValue()))
                .toList();

        return new DailyMedicationResponse(date, timeGroups);
    }

    // 복약 일정 수정
    public MedicationScheduleResponse update(Long userId, Long id, MedicationScheduleRequest request) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);

        medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(id)
                .forEach(medicationIntakeLogRepository::delete);
        medicationScheduleTimeRepository
                .findByMedicationScheduleMedicine_MedicationSchedule_IdOrderBySortOrderAsc(id)
                .forEach(medicationScheduleTimeRepository::delete);
        medicationScheduleMedicineRepository.deleteByMedicationScheduleId(id);

        schedule.update(
                userId,
                request.hospitalName(),
                request.pharmacyName(),
                request.dispensedDate(),
                schedule.getIsActive()
        );

        List<MedicationScheduleMedicine> medicines = saveMedicines(schedule, request);
        medicines = medicationScheduleWindowService.recalculateSchedule(schedule);
        medicationNotificationService.syncMedicationReminders(schedule);

        return toResponse(schedule, medicines);
    }

    public void delete(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);

        medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(id)
                .forEach(medicationIntakeLogRepository::delete);
        medicationScheduleTimeRepository.findByMedicationScheduleMedicine_MedicationSchedule_IdOrderBySortOrderAsc(id)
                .forEach(medicationScheduleTimeRepository::delete);
        medicationScheduleMedicineRepository.deleteByMedicationScheduleId(id);
        medicationNotificationService.cancelMedicationReminders(id);
        medicationScheduleRepository.delete(schedule);
    }

    private MedicationSchedule findOwnedSchedule(Long userId, Long id) {
        MedicationSchedule schedule = medicationScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return schedule;
    }

    private MedicationScheduleResponse toResponse(MedicationSchedule schedule) {
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(schedule.getId());
        return toResponse(schedule, medicines);
    }

    private MedicationScheduleResponse toResponse(
            MedicationSchedule schedule,
            List<MedicationScheduleMedicine> medicines
    ) {
        MedicationScheduleMedicine primaryMedicine = medicines.isEmpty() ? null : medicines.get(0);
        LocalDate startDate = medicines.stream()
                .map(MedicationScheduleMedicine::getStartDate)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        LocalDate endDate = medicines.stream()
                .map(MedicationScheduleMedicine::getEndDate)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        Integer durationDays = medicines.stream()
                .map(MedicationScheduleMedicine::getDurationDays)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        boolean active = medicines.isEmpty()
                ? Boolean.TRUE.equals(schedule.getIsActive())
                : medicines.stream().anyMatch(medicine -> Boolean.TRUE.equals(medicine.getIsActive()));

        return new MedicationScheduleResponse(
                schedule.getId(),
                schedule.getUserId(),
                primaryMedicine != null ? primaryMedicine.getMedicineId() : null,
                primaryMedicine != null ? primaryMedicine.getCustomMedicineName() : null,
                schedule.getHospitalName(),
                schedule.getPharmacyName(),
                primaryMedicine != null ? primaryMedicine.getDosageAmount() : null,
                primaryMedicine != null ? primaryMedicine.getDosageUnit() : null,
                primaryMedicine != null ? primaryMedicine.getTimesPerDay() : null,
                durationDays,
                startDate,
                endDate,
                schedule.getDispensedDate(),
                active,
                schedule.getCreatedAt(),
                schedule.getUpdatedAt(),
                medicines.stream().map(this::toMedicineResponse).toList()
        );
    }

    private MedicationScheduleMedicineResponse toMedicineResponse(MedicationScheduleMedicine medicine) {
        return new MedicationScheduleMedicineResponse(
                medicine.getId(),
                medicine.getMedicationSchedule().getId(),
                medicine.getMedicineId(),
                medicine.getCustomMedicineName(),
                medicine.getDosageAmount(),
                medicine.getDosageUnit(),
                medicine.getTimesPerDay(),
                medicine.getDurationDays(),
                medicine.getStartDate(),
                medicine.getEndDate(),
                medicine.getIsActive(),
                medicine.getCreatedAt(),
                medicine.getUpdatedAt()
        );
    }

    private List<MedicationScheduleMedicine> saveMedicines(
            MedicationSchedule schedule,
            MedicationScheduleRequest request
    ) {
        if (request.medicines() == null || request.medicines().isEmpty()) {
            return List.of();
        }

        LocalDate baseStartDate = request.startDate() != null
                ? request.startDate()
                : LocalDate.now(SCHEDULE_ZONE);

        return request.medicines().stream()
                .map(medicineRequest -> saveMedicine(schedule, medicineRequest, baseStartDate, request.durationDays()))
                .toList();
    }

    private MedicationScheduleMedicine saveMedicine(
            MedicationSchedule schedule,
            MedicationScheduleMedicineRequest medicineRequest,
            LocalDate baseStartDate,
            Integer defaultDurationDays
    ) {
        int durationDays = normalizeDurationDays(
                medicineRequest.durationDays() != null ? medicineRequest.durationDays() : defaultDurationDays
        );
        LocalDate endDate = baseStartDate.plusDays(durationDays - 1L);

        return medicationScheduleMedicineRepository.save(MedicationScheduleMedicine.builder()
                .medicationSchedule(schedule)
                .medicineId(medicineRequest.medicineId())
                .customMedicineName(medicineRequest.customMedicineName())
                .dosageAmount(medicineRequest.dosageAmount())
                .dosageUnit(medicineRequest.dosageUnit())
                .timesPerDay(medicineRequest.timesPerDay())
                .durationDays(durationDays)
                .startDate(baseStartDate)
                .endDate(endDate)
                .isActive(isActive(endDate))
                .build());
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

    private boolean isScheduledOnDate(MedicationScheduleMedicine medicine, LocalDate date) {
        LocalDate startDate = medicine.getStartDate();
        LocalDate endDate = medicine.getEndDate();

        if (startDate == null || endDate == null) {
            return false;
        }

        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    private Map<Long, MedicationIntakeLog> buildIntakeLogByScheduleTimeId(List<Long> scheduleIds, LocalDate date) {
        if (scheduleIds.isEmpty()) {
            return Map.of();
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1L).atStartOfDay();

        return medicationIntakeLogRepository
                .findByMedicationScheduleIdInAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(
                        scheduleIds,
                        start,
                        end
                ).stream()
                .filter(intakeLog -> intakeLog.getMedicationScheduleTime() != null)
                .collect(java.util.stream.Collectors.toMap(
                        intakeLog -> intakeLog.getMedicationScheduleTime().getId(),
                        intakeLog -> intakeLog,
                        (left, right) -> right
                ));
    }
}
