package com.ibmteam02.backend_medication.schedule.service;

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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationIntakeLogService {

    private final MedicationIntakeLogRepository medicationIntakeLogRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;

    // 복약 기록을 새로 생성
    public MedicationIntakeLogResponse create(MedicationIntakeLogRequest request) {
        MedicationIntakeLog intakeLog = MedicationIntakeLog.builder()
                .medicationSchedule(findSchedule(request.medicationScheduleId()))
                .medicationScheduleTime(findScheduleTime(request.medicationScheduleTimeId()))
                .status(request.status())
                .scheduledAt(request.scheduledAt())
                .takenAt(request.takenAt())
                .build();

        return toResponse(medicationIntakeLogRepository.save(intakeLog));
    }

    // 복약 기록 단건을 조회
    @Transactional(readOnly = true)
    public MedicationIntakeLogResponse get(Long id) {
        return toResponse(findById(id));
    }

    // 복약 일정 기준으로 복약 기록 목록을 조회
    @Transactional(readOnly = true)
    public List<MedicationIntakeLogResponse> getByScheduleId(Long medicationScheduleId) {
        return medicationIntakeLogRepository.findByMedicationScheduleIdOrderByScheduledAtDesc(medicationScheduleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 기존 복약 기록을 수정
    public MedicationIntakeLogResponse update(Long id, MedicationIntakeLogRequest request) {
        MedicationIntakeLog intakeLog = findById(id);
        intakeLog.update(
                findSchedule(request.medicationScheduleId()),
                findScheduleTime(request.medicationScheduleTimeId()),
                request.status(),
                request.scheduledAt(),
                request.takenAt()
        );
        return toResponse(intakeLog);
    }

    // 복약 기록을 삭제
    public void delete(Long id) {
        medicationIntakeLogRepository.delete(findById(id));
    }

    // ID로 복약 일정을 찾고 없으면 예외
    private MedicationSchedule findSchedule(Long id) {
        return medicationScheduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication schedule not found"));
    }

    // ID로 복용 시간을 찾고 없으면 예외를 던지며 null은 그대로 허용.
    private MedicationScheduleTime findScheduleTime(Long id) {
        if (id == null) {
            return null;
        }
        return medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication schedule time not found"));
    }

    // ID로 복약 기록을 찾고 없으면 예외
    private MedicationIntakeLog findById(Long id) {
        return medicationIntakeLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication intake log not found"));
    }

    // 엔티티를 응답 DTO로 변환
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
