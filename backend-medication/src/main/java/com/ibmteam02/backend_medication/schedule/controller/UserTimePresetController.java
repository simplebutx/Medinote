package com.ibmteam02.backend_medication.schedule.controller;

import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetGroupResponse;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetSaveRequest;
import com.ibmteam02.backend_medication.schedule.service.UserTimePresetService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/medication-time-presets")
@RequiredArgsConstructor
public class UserTimePresetController {

    private final UserTimePresetService userTimePresetService;

    @GetMapping
    public List<UserTimePresetGroupResponse> getPresets(@AuthenticationPrincipal Long userId) {
        return userTimePresetService.getPresets(userId);
    }

    @PutMapping
    public List<UserTimePresetGroupResponse> replacePresets(
            @AuthenticationPrincipal Long userId,
            @RequestBody UserTimePresetSaveRequest request
    ) {
        return userTimePresetService.replacePresets(userId, request);
    }
}
