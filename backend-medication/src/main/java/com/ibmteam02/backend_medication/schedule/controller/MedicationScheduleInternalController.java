package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/medication-schedules")
@RequiredArgsConstructor
public class MedicationScheduleInternalController {

    private final MedicationScheduleService medicationScheduleService;

    // 특정 유저의 전체 복약 일정 목록 조회 (서버 간 통신용)
    @GetMapping
    public List<MedicationScheduleResponse> getSchedulesByUserId(@RequestParam("userId") Long userId) {
        return medicationScheduleService.getList(userId, Pageable.unpaged()).getContent();
    }
}
