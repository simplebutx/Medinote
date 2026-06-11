package com.ibmteam02.backend_medication.notification.push;

import com.ibmteam02.backend_medication.notification.domain.MedicationNotification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
// 알림 발송하는 역할 (띄우는건 프론트)
public class LoggingPushProvider implements PushProvider {

    @Override
    public void send(MedicationNotification notification) {
        log.info(
                "Medication notification sent. userId={}, notificationId={}, title={}, body={}",
                notification.getUserId(),
                notification.getId(),
                notification.getTitle(),
                notification.getBody()
        );
    }
}
