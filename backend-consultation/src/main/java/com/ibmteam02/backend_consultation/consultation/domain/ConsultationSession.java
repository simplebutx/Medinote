package com.ibmteam02.backend_consultation.consultation.domain;

import com.ibmteam02.backend_consultation.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "consultation_session") //약사 상담 대화방
public class ConsultationSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; //방 번호

    @Column(nullable = false)
    private Long customerId; // 방 주인 (일반 유저)

    private Long pharmacistId; //약사 유저

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(columnDefinition = "TEXT")
    private String chatLog; //AI 답변 가이드를 위한 대화 전체 내용

    @Column(columnDefinition = "TEXT")
    private String aiSummary; //AI 요약

    @Builder
    private ConsultationSession(Long id, Long customerId, Long pharmacistId, SessionStatus status){
        this.id = id;
        this.customerId = customerId;
        this.pharmacistId = pharmacistId;
        this.status = status != null ? status : SessionStatus.PENDING; //약사 매칭 전 상태값
    }

    // 대화방 session 생성
    public static ConsultationSession createSession(Long customerId){
        return ConsultationSession.builder()
                .customerId(customerId)
                .status(SessionStatus.PENDING)
                .build();
    }

    //약사 대화방 매칭
    public void matchPharmacist(Long pharmacistId){
        this.pharmacistId = pharmacistId;
        this.status = SessionStatus.MATCHED;
    }

    //상담 종료
    public void closeSession(){
        this.status = SessionStatus.CLOSED;
    }

    //대화 전체 내용 업데이트
    public void updateChatLog(String chatLog){
        this.chatLog = chatLog;
    }

    //상담 요약 저장
    public void updateConsultationSummary(String aiAnswerGuide){
        this.aiSummary = aiAnswerGuide;
    }

}
