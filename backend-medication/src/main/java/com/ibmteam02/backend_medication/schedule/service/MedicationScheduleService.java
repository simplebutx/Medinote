package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleMedicineRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleMedicineResponse;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.repository.MedicationIntakeLogRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
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

    // 복약 일정 생성
    public MedicationScheduleResponse create(Long userId, MedicationScheduleRequest request) {
        MedicationSchedule schedule = medicationScheduleRepository.save(MedicationSchedule.builder()
                .userId(userId)
                .hospitalName(request.hospitalName())
                .pharmacyName(request.pharmacyName())
                .dispensedDate(request.dispensedDate())
                .isActive(Boolean.TRUE)
                .build());

        List<MedicationScheduleMedicine> medicines = saveMedicines(schedule, request);
        syncScheduleActivity(schedule, medicines);

        return toResponse(schedule, medicines);
    }

    // 복약 스케줄 상세
    @Transactional(readOnly = true)
    public MedicationScheduleResponse getDetail(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);
        return toResponse(schedule);
    }

    // 복약 스케쥴 목록
    @Transactional(readOnly = true)
    public List<MedicationScheduleResponse> getList(Long userId) {
        return medicationScheduleRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // 복약 스케쥴 수정
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
        syncScheduleActivity(schedule, medicines);

        return toResponse(schedule, medicines);
    }

    // 약별 시작일/종료일/활성 상태를 다시 계산해서 갱신
    public MedicationScheduleResponse initializeScheduleWindow(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(id);

        for (MedicationScheduleMedicine medicine : medicines) {
            LocalDate startDate = medicine.getStartDate() != null
                    ? medicine.getStartDate()
                    : LocalDate.now(SCHEDULE_ZONE);
            int durationDays = normalizeDurationDays(medicine.getDurationDays());
            LocalDate endDate = startDate.plusDays(durationDays - 1L);
            medicine.updateScheduleWindow(startDate, endDate, isActive(endDate));
        }

        syncScheduleActivity(schedule, medicines);
        medicationScheduleRepository.saveAndFlush(schedule);

        return toResponse(schedule, medicines);
    }

    // 삭제
    public void delete(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);

        medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(id)
                .forEach(medicationIntakeLogRepository::delete);
        medicationScheduleTimeRepository.findByMedicationScheduleMedicine_MedicationSchedule_IdOrderBySortOrderAsc(id)
                .forEach(medicationScheduleTimeRepository::delete);
        medicationScheduleMedicineRepository.deleteByMedicationScheduleId(id);
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
