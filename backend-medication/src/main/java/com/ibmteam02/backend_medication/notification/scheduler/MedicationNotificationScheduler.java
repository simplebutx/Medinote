package com.ibmteam02.backend_medication.notification.scheduler;

import com.ibmteam02.backend_medication.notification.service.MedicationNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MedicationNotificationScheduler {

    private final MedicationNotificationService medicationNotificationService;

    // 60초마다
    @Scheduled(fixedDelayString = "${notification.scheduler.fixed-delay-ms:60000}")
    public void sendDueNotifications() {
        medicationNotificationService.sendDueNotifications();
    }
}
