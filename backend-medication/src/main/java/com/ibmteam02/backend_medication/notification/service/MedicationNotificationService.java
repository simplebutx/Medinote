package com.ibmteam02.backend_medication.notification.service;

import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.notification.domain.MedicationNotification;
import com.ibmteam02.backend_medication.notification.domain.NotificationStatus;
import com.ibmteam02.backend_medication.notification.domain.NotificationType;
import com.ibmteam02.backend_medication.notification.dto.MedicationNotificationResponse;
import com.ibmteam02.backend_medication.notification.dto.TestNotificationRequest;
import com.ibmteam02.backend_medication.notification.push.PushProvider;
import com.ibmteam02.backend_medication.notification.repository.MedicationNotificationRepository;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleMedicineRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleRepository;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicationNotificationService {

    private static final ZoneId NOTIFICATION_ZONE = ZoneId.of("Asia/Seoul");
    private static final String DEFAULT_TITLE = "복약 시간이에요";

    private final MedicationNotificationRepository medicationNotificationRepository;
    private final MedicationScheduleRepository medicationScheduleRepository;
    private final MedicationScheduleMedicineRepository medicationScheduleMedicineRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;
    private final PushProvider pushProvider;

    // 알림 목록 (실패알림 제외, 삭제한 알림 제외)
    public List<MedicationNotificationResponse> getList(Long userId) {
        return medicationNotificationRepository
                .findVisibleByUserIdAndStatusNotOrderByScheduledAtDesc(userId, NotificationStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public MedicationNotificationResponse markRead(Long userId, Long notificationId) {
        MedicationNotification notification = medicationNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        notification.markRead();
        return toResponse(notification);
    }

    public void delete(Long userId, Long notificationId) {
        MedicationNotification notification = medicationNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        notification.hide();
    }

    public void deleteAll(Long userId) {
        medicationNotificationRepository.findByUserIdOrderByScheduledAtDesc(userId)
                .forEach(MedicationNotification::hide);
    }

    public MedicationNotificationResponse sendTest(Long userId, TestNotificationRequest request) {
        MedicationNotification notification = medicationNotificationRepository.save(MedicationNotification.builder()
                .userId(userId)
                .medicationScheduleId(0L)
                .medicationScheduleMedicineId(0L)
                .medicationScheduleTimeId(0L)
                .type(NotificationType.MEDICATION_REMINDER)
                .title(resolveTestTitle(request))
                .body(resolveTestBody(request))
                .scheduledAt(LocalDateTime.now(NOTIFICATION_ZONE))
                .build());

        send(notification);
        return toResponse(notification);
    }

    public void syncMedicationReminders(MedicationSchedule schedule) {
        medicationNotificationRepository.deleteByMedicationScheduleIdAndStatus(
                schedule.getId(),
                NotificationStatus.PENDING
        );

        if (!Boolean.TRUE.equals(schedule.getIsActive())) {
            return;
        }

        List<MedicationNotification> notifications = buildMedicationReminderNotifications(schedule);
        medicationNotificationRepository.saveAll(notifications);
    }

    public void cancelMedicationReminders(Long medicationScheduleId) {
        medicationNotificationRepository.deleteByMedicationScheduleIdAndStatus(
                medicationScheduleId,
                NotificationStatus.PENDING
        );
    }

    public void sendDueNotifications() {
        LocalDateTime now = LocalDateTime.now(NOTIFICATION_ZONE).truncatedTo(ChronoUnit.MINUTES);
        List<MedicationNotification> notifications =
                medicationNotificationRepository.findByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
                        NotificationStatus.PENDING,
                        now
                );

        notifications.forEach(notification -> {
            send(notification);
            medicationScheduleRepository.findById(notification.getMedicationScheduleId())
                    .ifPresent(this::syncMedicationReminders);
        });
    }

    // 알림 전송
    private void send(MedicationNotification notification) {
        try {
            pushProvider.send(notification);
            notification.markSent();
        } catch (RuntimeException exception) {
            notification.markFailed(exception.getMessage());
        }
    }

    // 복약 일정을 보고, 앞으로 보낼 알림 엔티티 생성 함수
    private List<MedicationNotification> buildMedicationReminderNotifications(MedicationSchedule schedule) {
        List<MedicationScheduleMedicine> medicines =
                medicationScheduleMedicineRepository.findByMedicationScheduleIdOrderByIdAsc(schedule.getId());
        List<MedicationNotification> notifications = new ArrayList<>();  // db에 저장할 복약 알림들을 잠깐 담아두는 리스트
        LocalDateTime now = LocalDateTime.now(NOTIFICATION_ZONE);

        // 복약 일정안에 약을 하나씩 돌면서, 각 약시간마다 다음 알림을 만들어 리스트에 넣기
        for (MedicationScheduleMedicine medicine : medicines) {
            if (!Boolean.TRUE.equals(medicine.getIsActive())) {
                continue;
            }

            List<MedicationScheduleTime> times =
                    medicationScheduleTimeRepository.findByMedicationScheduleMedicineIdOrderBySortOrderAsc(medicine.getId());

            for (MedicationScheduleTime time : times) {
                buildNextNotificationForTime(schedule, medicine, time, now)
                        .ifPresent(notifications::add);
            }
        }

        return notifications;
    }

    // 다음에 울릴 알림 1개 생성
    private java.util.Optional<MedicationNotification> buildNextNotificationForTime(
            MedicationSchedule schedule,
            MedicationScheduleMedicine medicine,
            MedicationScheduleTime time,
            LocalDateTime now
    ) {
        LocalDate startDate = medicine.getStartDate();
        LocalDate endDate = medicine.getEndDate();

        if (startDate == null || endDate == null || endDate.isBefore(now.toLocalDate())) {
            return java.util.Optional.empty();
        }

        // 복약 시작일이 오늘 전이면 오늘부터 검사
        // 복약 시작일이 오늘 이후면 복약 시작일부터 검사
        LocalDate cursor = startDate.isBefore(now.toLocalDate()) ? now.toLocalDate() : startDate;

        // cursor 날짜가 복약 종료일을 넘기 전까지 반복
        while (!cursor.isAfter(endDate)) {
            LocalDateTime scheduledAt = cursor.atTime(time.getTakeTime());

            // 오늘부터 종료일까지 돌면서 scheduledAt이 현재 시각 이후라면, 그 시간을 기준으로 복약 알림 객체를 하나 만들어 반환
            if (!scheduledAt.isBefore(now)) {
                return java.util.Optional.of(MedicationNotification.builder()
                        .userId(schedule.getUserId())
                        .medicationScheduleId(schedule.getId())
                        .medicationScheduleMedicineId(medicine.getId())
                        .medicationScheduleTimeId(time.getId())
                        .type(NotificationType.MEDICATION_REMINDER)
                        .title(DEFAULT_TITLE)
                        .body(buildMedicationReminderBody(medicine, time.getTakeTime()))
                        .scheduledAt(scheduledAt)
                        .build());
            }

            cursor = cursor.plusDays(1L);
        }

        return java.util.Optional.empty();
    }

    // 알림 내용
    private String buildMedicationReminderBody(MedicationScheduleMedicine medicine, LocalTime takeTime) {
        String medicineName = medicine.getCustomMedicineName();

        if (medicineName == null || medicineName.isBlank()) {
            medicineName = "등록한 약";
        }

        return medicineName + " 복용할 시간입니다. (" + takeTime + ")";
    }


    // =============================================================

    private String resolveTestTitle(TestNotificationRequest request) {
        if (request != null && request.title() != null && !request.title().isBlank()) {
            return request.title();
        }

        return "테스트 알림";
    }

    private String resolveTestBody(TestNotificationRequest request) {
        if (request != null && request.body() != null && !request.body().isBlank()) {
            return request.body();
        }

        return "알림 발송 테스트입니다.";
    }

    private MedicationNotificationResponse toResponse(MedicationNotification notification) {
        return new MedicationNotificationResponse(
                notification.getId(),
                notification.getUserId(),
                notification.getMedicationScheduleId(),
                notification.getMedicationScheduleMedicineId(),
                notification.getMedicationScheduleTimeId(),
                notification.getType(),
                notification.getStatus(),
                notification.getTitle(),
                notification.getBody(),
                notification.getScheduledAt(),
                notification.getSentAt(),
                notification.getReadAt(),
                notification.getFailureReason(),
                notification.getCreatedAt(),
                notification.getUpdatedAt()
        );
    }
}
