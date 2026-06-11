package com.ibmteam02.backend_consultation.notification.service;

import com.ibmteam02.backend_consultation.notification.domain.ConsultationNotification;
import com.ibmteam02.backend_consultation.notification.dto.ConsultationNotificationResponse;
import com.ibmteam02.backend_consultation.notification.push.ConsultationPushProvider;
import com.ibmteam02.backend_consultation.notification.repository.ConsultationNotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ConsultationNotificationService {

    private static final int PREVIEW_MAX_LENGTH = 80;
    private static final String NEW_MESSAGE_TITLE = "새 상담 메시지";

    private final ConsultationNotificationRepository consultationNotificationRepository;
    private final ConsultationPushProvider consultationPushProvider;

    @Transactional(readOnly = true)
    public List<ConsultationNotificationResponse> getList(Long receiverId) {
        return consultationNotificationRepository.findVisibleByReceiverIdOrderByCreatedAtDesc(receiverId).stream()
                .map(this::toResponse)
                .toList();
    }

    public ConsultationNotificationResponse markRead(Long receiverId, Long notificationId) {
        ConsultationNotification notification = findOwnedNotification(receiverId, notificationId);
        notification.markRead();
        return toResponse(notification);
    }

    public void delete(Long receiverId, Long notificationId) {
        ConsultationNotification notification = findOwnedNotification(receiverId, notificationId);
        notification.hide();
    }

    public void deleteAll(Long receiverId) {
        consultationNotificationRepository.findByReceiverIdOrderByCreatedAtDesc(receiverId)
                .forEach(ConsultationNotification::hide);
    }

    // 알림 데이터를 만들고 전송 요청
    public void notifyNewMessage(
            Long receiverId,
            Long senderId,
            Long consultationSessionId,
            Long consultationMessageId,
            String message
    ) {
        if (receiverId == null || senderId == null || receiverId.equals(senderId)) {
            return;
        }

        ConsultationNotification notification = consultationNotificationRepository.save(
                ConsultationNotification.builder()
                        .receiverId(receiverId)
                        .senderId(senderId)
                        .consultationSessionId(consultationSessionId)
                        .consultationMessageId(consultationMessageId)
                        .title(NEW_MESSAGE_TITLE)
                        .body(createMessagePreview(message))
                        .build()
        );

        consultationPushProvider.send(notification);
    }

    private ConsultationNotification findOwnedNotification(Long receiverId, Long notificationId) {
        return consultationNotificationRepository.findByIdAndReceiverId(notificationId, receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Consultation notification not found"));
    }

    // 알림 메세지 내용
    private String createMessagePreview(String message) {
        if (message == null || message.isBlank()) {
            return "새 메시지가 도착했습니다.";
        }

        String trimmed = message.trim();
        if (trimmed.length() <= PREVIEW_MAX_LENGTH) {
            return trimmed;
        }

        return trimmed.substring(0, PREVIEW_MAX_LENGTH) + "...";
    }

    private ConsultationNotificationResponse toResponse(ConsultationNotification notification) {
        return new ConsultationNotificationResponse(
                notification.getId(),
                notification.getReceiverId(),
                notification.getSenderId(),
                notification.getConsultationSessionId(),
                notification.getConsultationMessageId(),
                notification.getTitle(),
                notification.getBody(),
                notification.getReadAt(),
                notification.getCreatedAt(),
                notification.getUpdatedAt()
        );
    }
}
