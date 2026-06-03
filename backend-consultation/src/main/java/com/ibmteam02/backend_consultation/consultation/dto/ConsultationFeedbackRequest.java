package com.ibmteam02.backend_consultation.consultation.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConsultationFeedbackRequest {
    private Integer rating; // 별점
    private String comment; //한줄평
    private Long pharmacistId; //약사ID
}
