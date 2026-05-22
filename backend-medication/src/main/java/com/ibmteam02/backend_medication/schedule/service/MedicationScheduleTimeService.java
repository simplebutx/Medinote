package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeResponse;
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

    // 복약 일정에 속한 복용 시간을 새로 생성
    public MedicationScheduleTimeResponse create(Long userId, MedicationScheduleTimeRequest request) {
        MedicationSchedule schedule = medicationScheduleRepository.findById(request.medicationScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        MedicationScheduleTime scheduleTime = MedicationScheduleTime.builder()
                .medicationSchedule(schedule)
                .timing(request.timing())
                .takeTime(request.takeTime())
                .sortOrder(request.sortOrder())
                .build();

        return toResponse(medicationScheduleTimeRepository.save(scheduleTime));
    }

    // 복용 시간 단건을 조회
    @Transactional(readOnly = true)
    public MedicationScheduleTimeResponse get(Long userId, Long id) {
        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationSchedule().getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return toResponse(scheduleTime);
    }

    // 복약 일정 기준으로 복용 시간 목록을 조회
    @Transactional(readOnly = true)
    public List<MedicationScheduleTimeResponse> getByScheduleId(Long userId, Long medicationScheduleId) {
        MedicationSchedule schedule = medicationScheduleRepository.findById(medicationScheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        return medicationScheduleTimeRepository.findByMedicationScheduleIdOrderBySortOrderAsc(medicationScheduleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 기존 복용 시간을 수정
    public MedicationScheduleTimeResponse update(Long userId, Long id, MedicationScheduleTimeRequest request) {
        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationSchedule().getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        MedicationSchedule schedule = medicationScheduleRepository.findById(request.medicationScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        scheduleTime.update(
                schedule,
                request.timing(),
                request.takeTime(),
                request.sortOrder()
        );
        return toResponse(scheduleTime);
    }

    // 복용 시간을 삭제
    public void delete(Long userId, Long id) {
        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationSchedule().getUserId().equals(userId)) {
            throw new ForbiddenException("You can only access your own schedule.");
        }

        medicationScheduleTimeRepository.delete(scheduleTime);
    }

    // 엔티티를 응답 DTO로 변환
    private MedicationScheduleTimeResponse toResponse(MedicationScheduleTime scheduleTime) {
        return new MedicationScheduleTimeResponse(
                scheduleTime.getId(),
                scheduleTime.getMedicationSchedule().getId(),
                scheduleTime.getTiming(),
                scheduleTime.getTakeTime(),
                scheduleTime.getSortOrder()
        );
    }
}
