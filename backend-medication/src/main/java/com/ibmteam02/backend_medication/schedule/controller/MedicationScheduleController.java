package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medication-schedules")
@RequiredArgsConstructor
public class MedicationScheduleController {

    private final MedicationScheduleService medicationScheduleService;

    // 복약 일정 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationScheduleResponse create(
            @AuthenticationPrincipal Long userId,
            @RequestBody MedicationScheduleRequest request
    ) {
        return medicationScheduleService.create(userId, request);
    }

    // 상세페이지 (수정페이지)
    @GetMapping("/{id}")
    public MedicationScheduleResponse get(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationScheduleService.getDetail(userId, id);
    }

    // 내 일정 목록
    @GetMapping
    public List<MedicationScheduleResponse> getByUserId(@AuthenticationPrincipal Long userId) {
        return medicationScheduleService.getList(userId);
    }

    // 내 일정 수정
    @PutMapping("/{id}")
    public MedicationScheduleResponse update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody MedicationScheduleRequest request
    ) {
        return medicationScheduleService.update(userId, id, request);
    }

    // 수정 완료 시 일정 업데이트 (수정 완료 시 호출)
    @PostMapping("/{id}/initialize-window")
    public MedicationScheduleResponse initializeWindow(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationScheduleService.initializeScheduleWindow(userId, id);
    }

    // 내 일정 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        medicationScheduleService.delete(userId, id);
    }
}
