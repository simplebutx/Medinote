package com.ibmteam02.backend_consultation.consultation.repository;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationFeedback;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationFeedbackRepository extends JpaRepository<ConsultationFeedback,Long> {
    boolean existsBySession(ConsultationSession session);
}
