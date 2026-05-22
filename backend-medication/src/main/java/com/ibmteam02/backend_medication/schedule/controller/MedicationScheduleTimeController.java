package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleTimeService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medication-schedule-times")
@RequiredArgsConstructor
public class MedicationScheduleTimeController {

    private final MedicationScheduleTimeService medicationScheduleTimeService;

    // 복약 일정에 속한 복용 시간을 새로 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationScheduleTimeResponse create(
            @AuthenticationPrincipal Long userId,
            @RequestBody MedicationScheduleTimeRequest request
    ) {
        return medicationScheduleTimeService.create(userId, request);
    }

    // 복용 시간 단건을 조회
    @GetMapping("/{id}")
    public MedicationScheduleTimeResponse get(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationScheduleTimeService.get(userId, id);
    }

    // 복약 일정 기준으로 복용 시간 목록을 조회
    @GetMapping
    public List<MedicationScheduleTimeResponse> getByScheduleId(
            @AuthenticationPrincipal Long userId,
            @RequestParam Long medicationScheduleId
    ) {
        return medicationScheduleTimeService.getByScheduleId(userId, medicationScheduleId);
    }

    // 시간 수정
    @PutMapping("/{id}")
    public MedicationScheduleTimeResponse update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody MedicationScheduleTimeRequest request
    ) {
        return medicationScheduleTimeService.update(userId, id, request);
    }

    // 시간 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        medicationScheduleTimeService.delete(userId, id);
    }
}
