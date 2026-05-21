package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeResponse;
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
public class MedicationScheduleTimeService {

    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;

    // 복약 일정에 속한 복용 시간을 새로 생성
    public MedicationScheduleTimeResponse create(MedicationScheduleTimeRequest request) {
        MedicationScheduleTime scheduleTime = MedicationScheduleTime.builder()
                .medicationSchedule(findSchedule(request.medicationScheduleId()))
                .timing(request.timing())
                .takeTime(request.takeTime())
                .sortOrder(request.sortOrder())
                .build();

        return toResponse(medicationScheduleTimeRepository.save(scheduleTime));
    }

    // 복용 시간 단건을 조회
    @Transactional(readOnly = true)
    public MedicationScheduleTimeResponse get(Long id) {
        return toResponse(findById(id));
    }

    // 복약 일정 기준으로 복용 시간 목록을 조회
    @Transactional(readOnly = true)
    public List<MedicationScheduleTimeResponse> getByScheduleId(Long medicationScheduleId) {
        return medicationScheduleTimeRepository.findByMedicationScheduleIdOrderBySortOrderAsc(medicationScheduleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 기존 복용 시간을 수정
    public MedicationScheduleTimeResponse update(Long id, MedicationScheduleTimeRequest request) {
        MedicationScheduleTime scheduleTime = findById(id);
        scheduleTime.update(
                findSchedule(request.medicationScheduleId()),
                request.timing(),
                request.takeTime(),
                request.sortOrder()
        );
        return toResponse(scheduleTime);
    }

    // 복용 시간을 삭제
    public void delete(Long id) {
        medicationScheduleTimeRepository.delete(findById(id));
    }

    // ID로 복약 일정을 찾고 없으면 예외
    private MedicationSchedule findSchedule(Long id) {
        return medicationScheduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication schedule not found"));
    }

    // ID로 복용 시간을 찾고 없으면 예외
    private MedicationScheduleTime findById(Long id) {
        return medicationScheduleTimeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication schedule time not found"));
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
