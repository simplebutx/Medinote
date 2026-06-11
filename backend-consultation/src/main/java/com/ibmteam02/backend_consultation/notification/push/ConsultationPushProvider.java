package com.ibmteam02.backend_consultation.notification.push;

import com.ibmteam02.backend_consultation.notification.domain.ConsultationNotification;

public interface ConsultationPushProvider {

    void send(ConsultationNotification notification);
}
