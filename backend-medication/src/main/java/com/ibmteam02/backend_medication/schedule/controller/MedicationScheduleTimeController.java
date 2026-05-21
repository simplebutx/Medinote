package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeRequest;
import com.ibmteam02.backend_medication.schedule.dto.MedicationScheduleTimeResponse;
import com.ibmteam02.backend_medication.schedule.service.MedicationScheduleTimeService;
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
@RequestMapping("/api/medication-schedule-times")
@RequiredArgsConstructor
public class MedicationScheduleTimeController {

    private final MedicationScheduleTimeService medicationScheduleTimeService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationScheduleTimeResponse create(@RequestBody MedicationScheduleTimeRequest request) {
        return medicationScheduleTimeService.create(request);
    }

    @GetMapping("/{id}")
    public MedicationScheduleTimeResponse get(@PathVariable Long id) {
        return medicationScheduleTimeService.get(id);
    }

    @GetMapping
    public List<MedicationScheduleTimeResponse> getByScheduleId(@RequestParam Long medicationScheduleId) {
        return medicationScheduleTimeService.getByScheduleId(medicationScheduleId);
    }

    @PutMapping("/{id}")
    public MedicationScheduleTimeResponse update(@PathVariable Long id, @RequestBody MedicationScheduleTimeRequest request) {
        return medicationScheduleTimeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        medicationScheduleTimeService.delete(id);
    }
}
