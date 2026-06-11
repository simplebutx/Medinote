package com.ibmteam02.backend_medication.notification.repository;

import com.ibmteam02.backend_medication.notification.domain.MedicationNotification;
import com.ibmteam02.backend_medication.notification.domain.NotificationStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicationNotificationRepository extends JpaRepository<MedicationNotification, Long> {
    // 해당 사용자의 모든 복약을 최신순으로 조회
    List<MedicationNotification> findByUserIdOrderByScheduledAtDesc(Long userId);

    @Query("""
            select n
            from MedicationNotification n
            where n.userId = :userId
              and (n.visible = true or n.visible is null)
              and n.status <> :excludedStatus
            order by n.scheduledAt desc
            """)
    // 사용자 화면에 보여줄 알림만 (visible true, status가 pending이 아닌것)
    List<MedicationNotification> findVisibleByUserIdAndStatusNotOrderByScheduledAtDesc(
            @Param("userId") Long userId,
            @Param("excludedStatus") NotificationStatus excludedStatus
    );

    // 특정 알림 하나 조회
    Optional<MedicationNotification> findByIdAndUserId(Long id, Long userId);

    // 시간이 된 알림 조회
    List<MedicationNotification> findByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
            NotificationStatus status,
            LocalDateTime scheduledAt
    );

    void deleteByMedicationScheduleIdAndStatus(Long medicationScheduleId, NotificationStatus status);

}
