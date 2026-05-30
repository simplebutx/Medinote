package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.DailyMedicationResponse;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleService;
import java.time.LocalDate;
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
@RequestMapping("/api/medication-schedules")
@RequiredArgsConstructor
public class MedicationScheduleController {

    private final MedicationScheduleService medicationScheduleService;

    // 蹂듭빟 ?쇱젙 ?앹꽦
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationScheduleResponse create(
            @AuthenticationPrincipal Long userId,
            @RequestBody MedicationScheduleRequest request
    ) {
        return medicationScheduleService.create(userId, request);
    }

    // ?곸꽭?섏씠吏 (?섏젙?섏씠吏)
    @GetMapping("/{id}")
    public MedicationScheduleResponse get(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationScheduleService.getDetail(userId, id);
    }

    // ???쇱젙 紐⑸줉
    @GetMapping
    public List<MedicationScheduleResponse> getByUserId(@AuthenticationPrincipal Long userId) {
        return medicationScheduleService.getList(userId);
    }

    // ?좏깮??吏쒖쭨 蹂듭빟 紐⑸줉
    @GetMapping("/daily")
    public DailyMedicationResponse getDailyMedications(
            @AuthenticationPrincipal Long userId,
            @RequestParam LocalDate date
    ) {
        return medicationScheduleService.getDailyMedications(userId, date);
    }

    // ???쇱젙 ?섏젙
    @PutMapping("/{id}")
    public MedicationScheduleResponse update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody MedicationScheduleRequest request
    ) {
        return medicationScheduleService.update(userId, id, request);
    }

    // ?섏젙 ?꾨즺 ???쇱젙 ?낅뜲?댄듃 (?섏젙 ?꾨즺 ???몄텧)
    @PostMapping("/{id}/initialize-window")
    public MedicationScheduleResponse initializeWindow(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationScheduleService.initializeScheduleWindow(userId, id);
    }

    // ???쇱젙 ??젣
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        medicationScheduleService.delete(userId, id);
    }
}
