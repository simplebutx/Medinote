package com.ibmteam02.backend_consultation.consultation.repository;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationMessage;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationMessageRepository extends JpaRepository<ConsultationMessage,Long> {
    List<ConsultationMessage>  findBySessionOrderByCreatedAtAsc(ConsultationSession session);
}
