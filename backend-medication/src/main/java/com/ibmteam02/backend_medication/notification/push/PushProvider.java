package com.ibmteam02.backend_medication.notification.push;

import com.ibmteam02.backend_medication.notification.domain.MedicationNotification;


// 알림 발송 인터페이스
public interface PushProvider {

    void send(MedicationNotification notification);
}
