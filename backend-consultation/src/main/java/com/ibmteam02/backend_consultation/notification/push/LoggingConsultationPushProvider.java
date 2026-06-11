package com.ibmteam02.backend_consultation.notification.push;

import com.ibmteam02.backend_consultation.notification.domain.ConsultationNotification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LoggingConsultationPushProvider implements ConsultationPushProvider {

    @Override
    public void send(ConsultationNotification notification) {
        log.info(
                "Consultation notification sent. receiverId={}, senderId={}, sessionId={}, messageId={}",
                notification.getReceiverId(),
                notification.getSenderId(),
                notification.getConsultationSessionId(),
                notification.getConsultationMessageId()
        );
    }
}
