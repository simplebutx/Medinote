package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
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

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final MedicationIntakeLogRepository medicationIntakeLogRepository;

    public MedicationScheduleResponse create(Long userId, MedicationScheduleRequest request) {
        LocalDate today = LocalDate.now(SCHEDULE_ZONE);

        MedicationSchedule schedule = medicationScheduleRepository.save(MedicationSchedule.builder()
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
                .durationDays(normalizeDurationDays(request.durationDays()))
                .startDate(today)
                .endDate(today)
                .dispensedDate(request.dispensedDate())
                .isActive(Boolean.TRUE)
                .build());

        List<MedicationScheduleMedicine> medicines = saveMedicines(schedule, request);
        syncScheduleSummary(schedule, medicines);

        return toResponse(schedule, medicines);
    }

    @Transactional(readOnly = true)
    public MedicationScheduleResponse getDetail(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);
        return toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<MedicationScheduleResponse> getList(Long userId) {
        return medicationScheduleRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public MedicationScheduleResponse update(Long userId, Long id, MedicationScheduleRequest request) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);

        medicationScheduleTimeRepository
                .findByMedicationScheduleMedicine_MedicationSchedule_IdOrderBySortOrderAsc(id)
                .forEach(medicationScheduleTimeRepository::delete);
        medicationScheduleMedicineRepository.deleteByMedicationScheduleId(id);

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
                normalizeDurationDays(request.durationDays()),
                schedule.getStartDate() != null ? schedule.getStartDate() : LocalDate.now(SCHEDULE_ZONE),
                schedule.getEndDate() != null ? schedule.getEndDate() : LocalDate.now(SCHEDULE_ZONE),
                request.dispensedDate(),
                schedule.getIsActive()
        );

        List<MedicationScheduleMedicine> medicines = saveMedicines(schedule, request);
        syncScheduleSummary(schedule, medicines);

        return toResponse(schedule, medicines);
    }

    public MedicationScheduleResponse initializeScheduleWindow(Long userId, Long id) {
        MedicationSchedule schedule = findOwnedSchedule(userId, id);
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(id);

        LocalDateTime referenceTime = schedule.getCreatedAt() != null
                ? schedule.getCreatedAt().atOffset(ZoneOffset.UTC).atZoneSameInstant(SCHEDULE_ZONE).toLocalDateTime()
                : LocalDateTime.now(SCHEDULE_ZONE);

        for (MedicationScheduleMedicine medicine : medicines) {
            List<MedicationScheduleTime> scheduleTimes = medicationScheduleTimeRepository
                    .findByMedicationScheduleMedicineIdOrderBySortOrderAsc(medicine.getId());
            LocalDate startDate = calculateStartDate(referenceTime, scheduleTimes);
            LocalDate endDate = calculateEndDate(medicine, scheduleTimes, referenceTime, startDate);
            medicine.updateScheduleWindow(startDate, endDate, isActive(endDate));
        }

        syncScheduleSummary(schedule, medicines);
        medicationScheduleRepository.saveAndFlush(schedule);

        return toResponse(schedule, medicines);
    }

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

        return new MedicationScheduleResponse(
                schedule.getId(),
                schedule.getUserId(),
                primaryMedicine != null ? primaryMedicine.getMedicineId() : schedule.getMedicineId(),
                primaryMedicine != null ? primaryMedicine.getCustomMedicineName() : schedule.getCustomMedicineName(),
                schedule.getHospitalName(),
                schedule.getPharmacyName(),
                primaryMedicine != null ? primaryMedicine.getDosageAmount() : schedule.getDosageAmount(),
                primaryMedicine != null ? primaryMedicine.getDosageUnit() : schedule.getDosageUnit(),
                primaryMedicine != null ? primaryMedicine.getFrequencyType() : schedule.getFrequencyType(),
                primaryMedicine != null ? primaryMedicine.getTimesPerDay() : schedule.getTimesPerDay(),
                primaryMedicine != null ? primaryMedicine.getIntervalHours() : schedule.getIntervalHours(),
                schedule.getDurationDays(),
                schedule.getStartDate(),
                schedule.getEndDate(),
                schedule.getDispensedDate(),
                schedule.getIsActive(),
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
                medicine.getFrequencyType(),
                medicine.getTimesPerDay(),
                medicine.getIntervalHours(),
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
        List<MedicationScheduleMedicineRequest> medicineRequests = normalizeMedicineRequests(request);
        if (medicineRequests.isEmpty()) {
            return List.of();
        }

        LocalDate today = LocalDate.now(SCHEDULE_ZONE);
        List<MedicationScheduleMedicine> medicines = new ArrayList<>();

        for (MedicationScheduleMedicineRequest medicineRequest : medicineRequests) {
            int durationDays = normalizeDurationDays(medicineRequest.durationDays());
            medicines.add(medicationScheduleMedicineRepository.save(MedicationScheduleMedicine.builder()
                    .medicationSchedule(schedule)
                    .medicineId(medicineRequest.medicineId())
                    .customMedicineName(medicineRequest.customMedicineName())
                    .dosageAmount(medicineRequest.dosageAmount())
                    .dosageUnit(medicineRequest.dosageUnit())
                    .frequencyType(medicineRequest.frequencyType())
                    .timesPerDay(medicineRequest.timesPerDay())
                    .intervalHours(medicineRequest.intervalHours())
                    .durationDays(durationDays)
                    .startDate(today)
                    .endDate(today.plusDays(durationDays - 1L))
                    .isActive(Boolean.TRUE)
                    .build()));
        }

        return medicines;
    }

    private List<MedicationScheduleMedicineRequest> normalizeMedicineRequests(MedicationScheduleRequest request) {
        if (request.medicines() != null && !request.medicines().isEmpty()) {
            return request.medicines();
        }

        if (request.medicineId() == null
                && (request.customMedicineName() == null || request.customMedicineName().isBlank())
                && request.dosageAmount() == null
                && request.timesPerDay() == null) {
            return List.of();
        }

        return List.of(new MedicationScheduleMedicineRequest(
                null,
                request.medicineId(),
                request.customMedicineName(),
                request.dosageAmount(),
                request.dosageUnit(),
                request.frequencyType(),
                request.timesPerDay(),
                request.intervalHours(),
                request.durationDays()
        ));
    }

    private void syncScheduleSummary(MedicationSchedule schedule, List<MedicationScheduleMedicine> medicines) {
        if (medicines.isEmpty()) {
            LocalDate today = LocalDate.now(SCHEDULE_ZONE);
            schedule.updateScheduleWindow(today, today, Boolean.TRUE);
            return;
        }

        MedicationScheduleMedicine primaryMedicine = medicines.get(0);
        LocalDate startDate = medicines.stream()
                .map(MedicationScheduleMedicine::getStartDate)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(LocalDate.now(SCHEDULE_ZONE));
        LocalDate endDate = medicines.stream()
                .map(MedicationScheduleMedicine::getEndDate)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(startDate);
        int durationDays = medicines.stream()
                .map(MedicationScheduleMedicine::getDurationDays)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(1);
        boolean active = medicines.stream().anyMatch(medicine -> Boolean.TRUE.equals(medicine.getIsActive()));

        schedule.update(
                schedule.getUserId(),
                primaryMedicine.getMedicineId(),
                primaryMedicine.getCustomMedicineName(),
                schedule.getHospitalName(),
                schedule.getPharmacyName(),
                primaryMedicine.getDosageAmount(),
                primaryMedicine.getDosageUnit(),
                primaryMedicine.getFrequencyType(),
                primaryMedicine.getTimesPerDay(),
                primaryMedicine.getIntervalHours(),
                durationDays,
                startDate,
                endDate,
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

    private LocalDate calculateEndDate(
            MedicationScheduleMedicine medicine,
            List<MedicationScheduleTime> scheduleTimes,
            LocalDateTime referenceTime,
            LocalDate startDate
    ) {
        int totalDailySlots = !scheduleTimes.isEmpty()
                ? scheduleTimes.size()
                : Math.max(medicine.getTimesPerDay() != null ? medicine.getTimesPerDay() : 1, 1);
        int totalDoseCount = normalizeDurationDays(medicine.getDurationDays()) * totalDailySlots;
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

    private boolean isActive(LocalDate endDate) {
        LocalDate today = LocalDate.now(SCHEDULE_ZONE);
        return endDate.isAfter(today) || endDate.isEqual(today);
    }
}
