package com.ibmteam02.backend_consultation.consultation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PharmacistFeedbackStatsResponse {
    private Double averageRating; //약사 별점 평균 통계
    private Long totalReviewCount; //총 후기 개수
    private List<ConsultationRoomResponse> recentFeedbacks; //최신 후기 3개
}
