package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationScheduleResponse create(@RequestBody MedicationScheduleRequest request) {
        return medicationScheduleService.create(request);
    }

    @GetMapping("/{id}")
    public MedicationScheduleResponse get(@PathVariable Long id) {
        return medicationScheduleService.get(id);
    }

    @GetMapping
    public List<MedicationScheduleResponse> getByUserId(@RequestParam Long userId) {
        return medicationScheduleService.getByUserId(userId);
    }

    @PutMapping("/{id}")
    public MedicationScheduleResponse update(@PathVariable Long id, @RequestBody MedicationScheduleRequest request) {
        return medicationScheduleService.update(id, request);
    }

    @PostMapping("/{id}/initialize-window")
    public MedicationScheduleResponse initializeWindow(@PathVariable Long id) {
        return medicationScheduleService.initializeScheduleWindow(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        medicationScheduleService.delete(id);
    }
}
