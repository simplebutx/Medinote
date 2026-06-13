package com.ibmteam02.backend_medication.smartpill.controller;

import com.ibmteam02.backend_medication.smartpill.dto.SmartPillDeviceResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotAssignmentResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotAssignmentSaveRequest;
import com.ibmteam02.backend_medication.smartpill.service.SmartPillAssignmentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/smartpill/devices")
@RequiredArgsConstructor
public class SmartPillDeviceController {

    private final SmartPillAssignmentService smartPillAssignmentService;

    // 내 장치 불러오기
    @GetMapping
    public List<SmartPillDeviceResponse> getDevices(@AuthenticationPrincipal Long userId) {
        return smartPillAssignmentService.getDevices(userId);
    }

    // 장치에 연결된 처방전/복약시간 가져오기
    @GetMapping("/{deviceId}/slot-assignments")
    public SmartPillSlotAssignmentResponse getAssignments(
            @AuthenticationPrincipal Long userId,
            @PathVariable String deviceId
    ) {
        return smartPillAssignmentService.getAssignments(userId, deviceId);
    }

    // 각 칸에 몇시의 약을 집어넣을지 연결
    @PutMapping("/{deviceId}/slot-assignments")
    public SmartPillSlotAssignmentResponse saveAssignments(
            @AuthenticationPrincipal Long userId,
            @PathVariable String deviceId,
            @RequestBody SmartPillSlotAssignmentSaveRequest request
    ) {
        return smartPillAssignmentService.saveAssignments(userId, deviceId, request);
    }

    // 장치 복약 측정 시작
    @PostMapping("/{deviceId}/start-detection")
    public SmartPillSlotAssignmentResponse startDetection(
            @AuthenticationPrincipal Long userId,
            @PathVariable String deviceId
    ) {
        return smartPillAssignmentService.startDetection(userId, deviceId);
    }

    // 장치 복약 측정 중지
    @PostMapping("/{deviceId}/pause-detection")
    public SmartPillSlotAssignmentResponse pauseDetection(
            @AuthenticationPrincipal Long userId,
            @PathVariable String deviceId
    ) {
        return smartPillAssignmentService.pauseDetection(userId, deviceId);
    }

    // 장치 복약 측정 초기화
    @PostMapping("/{deviceId}/reset")
    public SmartPillSlotAssignmentResponse resetAssignments(
            @AuthenticationPrincipal Long userId,
            @PathVariable String deviceId
    ) {
        return smartPillAssignmentService.resetAssignments(userId, deviceId);
    }
}
