package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationIntakeLogRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationIntakeLogResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationIntakeLogService;
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
@RequestMapping("/api/medication-intake-logs")
@RequiredArgsConstructor
public class MedicationIntakeLogController {

    private final MedicationIntakeLogService medicationIntakeLogService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationIntakeLogResponse create(
            @AuthenticationPrincipal Long userId,
            @RequestBody MedicationIntakeLogRequest request
    ) {
        return medicationIntakeLogService.create(userId, request);
    }

    @GetMapping("/{id}")
    public MedicationIntakeLogResponse get(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationIntakeLogService.get(userId, id);
    }

    @GetMapping
    public List<MedicationIntakeLogResponse> getByScheduleId(
            @AuthenticationPrincipal Long userId,
            @RequestParam Long medicationScheduleId
    ) {
        return medicationIntakeLogService.getByScheduleId(userId, medicationScheduleId);
    }

    @PutMapping("/{id}")
    public MedicationIntakeLogResponse update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody MedicationIntakeLogRequest request
    ) {
        return medicationIntakeLogService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        medicationIntakeLogService.delete(userId, id);
    }
}
