package com.ibmteam02.backend_consultation.notification.repository;

import com.ibmteam02.backend_consultation.notification.domain.ConsultationNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsultationNotificationRepository extends JpaRepository<ConsultationNotification, Long> {

    // 사용자가 받은 상담 알림 전부 표시
    List<ConsultationNotification> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);

    // 알림 하나
    Optional<ConsultationNotification> findByIdAndReceiverId(Long id, Long receiverId);

    // 알림 목록 화면에 보여줄 알림만 가져오는 함수
    @Query("""
            select n
            from ConsultationNotification n
            where n.receiverId = :receiverId
              and (n.visible = true or n.visible is null)
            order by n.createdAt desc
            """)
    List<ConsultationNotification> findVisibleByReceiverIdOrderByCreatedAtDesc(
            @Param("receiverId") Long receiverId
    );
}
