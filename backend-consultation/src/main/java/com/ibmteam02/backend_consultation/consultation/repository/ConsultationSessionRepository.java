package com.ibmteam02.backend_consultation.consultation.repository;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import com.ibmteam02.backend_consultation.consultation.domain.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationSessionRepository extends JpaRepository<ConsultationSession, Long> {
    //대기중인 상담 목록 조회
    List<ConsultationSession> findByStatus(SessionStatus status);

    //진행중, 완료 (특정 약사가 담당한 방)
    List<ConsultationSession> findByPharmacistIdAndStatus(Long pharmacistId, SessionStatus status);

    //특정 사용자가 신청한 모든 방 조회
    List<ConsultationSession> findByCustomerId(Long customerId);
}
