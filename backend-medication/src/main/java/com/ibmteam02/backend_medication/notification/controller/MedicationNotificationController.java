package com.ibmteam02.backend_medication.notification.controller;

import com.ibmteam02.backend_medication.notification.dto.MedicationNotificationResponse;
import com.ibmteam02.backend_medication.notification.dto.TestNotificationRequest;
import com.ibmteam02.backend_medication.notification.service.MedicationNotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medication-notifications")
@RequiredArgsConstructor
public class MedicationNotificationController {

    private final MedicationNotificationService medicationNotificationService;

    @GetMapping
    public List<MedicationNotificationResponse> getList(@AuthenticationPrincipal Long userId) {
        return medicationNotificationService.getList(userId);
    }

    // 읽음
    @PatchMapping("/{id}/read")
    public MedicationNotificationResponse markRead(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return medicationNotificationService.markRead(userId, id);
    }


    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        medicationNotificationService.delete(userId, id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(@AuthenticationPrincipal Long userId) {
        medicationNotificationService.deleteAll(userId);
    }

    // 테스트용 알림
    @PostMapping("/test")
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationNotificationResponse sendTest(
            @AuthenticationPrincipal Long userId,
            @RequestBody(required = false) TestNotificationRequest request
    ) {
        return medicationNotificationService.sendTest(userId, request);
    }
}
