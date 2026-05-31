package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.MedicationIntakeLogRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationIntakeLogResponse;
import com.ibmteam02.backend_medication.schedule.repository.MedicationIntakeLogRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationIntakeLogService {

    private final MedicationIntakeLogRepository medicationIntakeLogRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;

    // 복약 체크 생성
    public MedicationIntakeLogResponse create(Long userId, MedicationIntakeLogRequest request) {
        MedicationIntakeLog intakeLog = MedicationIntakeLog.builder()
                .medicationSchedule(findSchedule(userId, request.medicationScheduleId()))
                .medicationScheduleTime(findScheduleTime(userId, request.medicationScheduleTimeId()))
                .status(request.status())
                .scheduledAt(request.scheduledAt())
                .takenAt(request.takenAt())
                .build();

        return toResponse(medicationIntakeLogRepository.save(intakeLog));
    }

    // 복약 체크 조회
    @Transactional(readOnly = true)
    public MedicationIntakeLogResponse get(Long userId, Long id) {
        return toResponse(findById(userId, id));
    }

    // 복약 체크 목록 조회
    @Transactional(readOnly = true)
    public List<MedicationIntakeLogResponse> getByScheduleId(Long userId, Long medicationScheduleId) {
        findSchedule(userId, medicationScheduleId);

        return medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(medicationScheduleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 복약 체크 수정
    public MedicationIntakeLogResponse update(Long userId, Long id, MedicationIntakeLogRequest request) {
        MedicationIntakeLog intakeLog = findById(userId, id);
        intakeLog.update(
                findSchedule(userId, request.medicationScheduleId()),
                findScheduleTime(userId, request.medicationScheduleTimeId()),
                request.status(),
                request.scheduledAt(),
                request.takenAt()
        );
        return toResponse(intakeLog);
    }

    // 복약 체크 삭제
    public void delete(Long userId, Long id) {
        medicationIntakeLogRepository.delete(findById(userId, id));
    }

    private MedicationSchedule findSchedule(Long userId, Long id) {
        return medicationScheduleRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));
    }

    private MedicationScheduleTime findScheduleTime(Long userId, Long id) {
        if (id == null) {
            return null;
        }

        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationScheduleMedicine().getMedicationSchedule().getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Medication schedule time not found");
        }

        return scheduleTime;
    }

    private MedicationIntakeLog findById(Long userId, Long id) {
        MedicationIntakeLog intakeLog = medicationIntakeLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication intake log not found"));

        if (!intakeLog.getMedicationSchedule().getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Medication intake log not found");
        }

        return intakeLog;
    }

    private MedicationIntakeLogResponse toResponse(MedicationIntakeLog intakeLog) {
        return new MedicationIntakeLogResponse(
                intakeLog.getId(),
                intakeLog.getMedicationSchedule().getId(),
                intakeLog.getMedicationScheduleTime() != null ? intakeLog.getMedicationScheduleTime().getId() : null,
                intakeLog.getStatus(),
                intakeLog.getScheduledAt(),
                intakeLog.getTakenAt(),
                intakeLog.getCreatedAt()
        );
    }
}
