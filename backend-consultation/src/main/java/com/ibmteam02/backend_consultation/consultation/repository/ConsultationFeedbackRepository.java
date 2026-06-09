package com.ibmteam02.backend_consultation.consultation.repository;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationFeedback;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConsultationFeedbackRepository extends JpaRepository<ConsultationFeedback,Long> {
    boolean existsBySession(ConsultationSession session);
    Optional<ConsultationFeedback> findBySession(ConsultationSession session);

    //약사 평균 평점 조회
    @Query("SELECT AVG(f.rating) FROM ConsultationFeedback f WHERE f.pharmacistId = :pharmacistId")
    Double getAverageRatingByPharmacistId(@Param("pharmacistId") Long pharmacistId);

    //약사의 총 리뷰 개수 가져오기
    Long countByPharmacistId(Long pharmacistId);
}
