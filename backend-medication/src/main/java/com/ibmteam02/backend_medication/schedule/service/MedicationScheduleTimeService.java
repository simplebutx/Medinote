package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.notification.service.MedicationNotificationService;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeResponse;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationScheduleTimeService {

    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicationScheduleWindowService medicationScheduleWindowService;
    private final MedicationNotificationService medicationNotificationService;


    public MedicationScheduleTimeResponse create(Long userId, MedicationScheduleTimeRequest request) {
        MedicationScheduleMedicine scheduleMedicine = findOwnedScheduleMedicine(userId, request.medicationScheduleMedicineId());

        MedicationScheduleTime scheduleTime = MedicationScheduleTime.builder()
                .medicationScheduleMedicine(scheduleMedicine)
                .timing(request.timing())
                .takeTime(request.takeTime())
                .sortOrder(request.sortOrder())
                .build();

        MedicationScheduleTime savedScheduleTime = medicationScheduleTimeRepository.save(scheduleTime);
        medicationScheduleWindowService.recalculateMedicine(scheduleMedicine);
        medicationNotificationService.syncMedicationReminders(scheduleMedicine.getMedicationSchedule());
        return toResponse(savedScheduleTime);
    }

    @Transactional(readOnly = true)
    public MedicationScheduleTimeResponse get(Long userId, Long id) {
        MedicationScheduleTime scheduleTime = findOwnedScheduleTime(userId, id);
        return toResponse(scheduleTime);
    }

    @Transactional(readOnly = true)
    public List<MedicationScheduleTimeResponse> getByScheduleId(Long userId, Long medicationScheduleId) {
        MedicationSchedule schedule = medicationScheduleRepository.findById(medicationScheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return medicationScheduleTimeRepository
                .findByMedicationScheduleMedicine_MedicationSchedule_IdOrderBySortOrderAsc(medicationScheduleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public MedicationScheduleTimeResponse update(Long userId, Long id, MedicationScheduleTimeRequest request) {
        MedicationScheduleTime scheduleTime = findOwnedScheduleTime(userId, id);
        MedicationScheduleMedicine previousMedicine = scheduleTime.getMedicationScheduleMedicine();
        MedicationScheduleMedicine scheduleMedicine = findOwnedScheduleMedicine(userId, request.medicationScheduleMedicineId());

        scheduleTime.update(
                scheduleMedicine,
                request.timing(),
                request.takeTime(),
                request.sortOrder()
        );

        medicationScheduleWindowService.recalculateMedicine(scheduleMedicine);
        if (!previousMedicine.getId().equals(scheduleMedicine.getId())) {
            medicationScheduleWindowService.recalculateMedicine(previousMedicine);
        }
        syncChangedSchedules(scheduleMedicine, previousMedicine);

        return toResponse(scheduleTime);
    }

    public void delete(Long userId, Long id) {
        MedicationScheduleTime scheduleTime = findOwnedScheduleTime(userId, id);
        MedicationScheduleMedicine scheduleMedicine = scheduleTime.getMedicationScheduleMedicine();
        medicationScheduleTimeRepository.delete(scheduleTime);
        medicationScheduleWindowService.recalculateMedicine(scheduleMedicine);
        medicationNotificationService.syncMedicationReminders(scheduleMedicine.getMedicationSchedule());
    }

    private void syncChangedSchedules(
            MedicationScheduleMedicine scheduleMedicine,
            MedicationScheduleMedicine previousMedicine
    ) {
        MedicationSchedule schedule = scheduleMedicine.getMedicationSchedule();
        MedicationSchedule previousSchedule = previousMedicine.getMedicationSchedule();

        medicationNotificationService.syncMedicationReminders(schedule);
        if (!previousSchedule.getId().equals(schedule.getId())) {
            medicationNotificationService.syncMedicationReminders(previousSchedule);
        }
    }

    private MedicationScheduleMedicine findOwnedScheduleMedicine(Long userId, Long id) {
        MedicationScheduleMedicine scheduleMedicine = medicationScheduleMedicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule medicine not found"));

        if (!scheduleMedicine.getMedicationSchedule().getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return scheduleMedicine;
    }

    private MedicationScheduleTime findOwnedScheduleTime(Long userId, Long id) {
        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationScheduleMedicine().getMedicationSchedule().getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return scheduleTime;
    }

    private MedicationScheduleTimeResponse toResponse(MedicationScheduleTime scheduleTime) {
        return new MedicationScheduleTimeResponse(
                scheduleTime.getId(),
                scheduleTime.getMedicationScheduleMedicine().getMedicationSchedule().getId(),
                scheduleTime.getMedicationScheduleMedicine().getId(),
                scheduleTime.getTiming(),
                scheduleTime.getTakeTime(),
                scheduleTime.getSortOrder()
        );
    }
}
