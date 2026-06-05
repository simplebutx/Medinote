package com.ibmteam02.backend_consultation.consultation.service;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationFeedback;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationMessage;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import com.ibmteam02.backend_consultation.consultation.domain.SessionStatus;
import com.ibmteam02.backend_consultation.consultation.dto.*;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationFeedbackRepository;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationMessageRepository;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationSessionRepository;
import com.ibmteam02.backend_consultation.global.auth.AuthUserClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationService {
    private final ConsultationSessionRepository consultationSessionRepository;
    private final ConsultationMessageRepository consultationMessageRepository;
    private final ConsultationFeedbackRepository consultationFeedbackRepository;
    private final AuthUserClient authUserClient;

    // 공통 변환 메서드
    public ConsultationRoomResponse convertToResponse(ConsultationSession session) {
        //일반 유저 username 가져오기
        String customerName = authUserClient.getCustomerName(session.getCustomerId());

        String firstMessage = consultationMessageRepository.findBySessionOrderByCreatedAtAsc(session)
                .stream()
                .findFirst()
                .map(ConsultationMessage::getContent)
                .orElse("상담 요청 메시지가 없습니다");

        //피드백 정보 조회
        ConsultationFeedback feedback = consultationFeedbackRepository.findBySession(session).orElse(null);

        return ConsultationRoomResponse.builder()
                .roomId(session.getId())
                .customId(session.getCustomerId())
                .status(session.getStatus().name())
                .createdAt(session.getCreatedAt())
                .firstMessage(firstMessage)
                .customerName(customerName)
                .rating(feedback != null ? feedback.getRating() : null)
                .feedbackComment(feedback != null ? feedback.getComment() : null)
                .build();
    }

    //일반유저가 상담 신청 -> 대화방 생성
    @Transactional
    public Long createRoom(Long customerId, String role) {
        if (!"USER".equals(role) && !"ROLE_USER".equals(role)) {
            throw new IllegalArgumentException("일반 유저 회원 기능입니다");
        }
        ConsultationSession session = ConsultationSession.createSession(customerId);
        ConsultationSession savedSession = consultationSessionRepository.save(session);
        return savedSession.getId();
    }

    //약사 상담방 매칭
    @Transactional
    public void matchPharmacist(Long roomId, Long pharmacistId, String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 상담 수락이 가능합니다");
        }

        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다"));

        session.matchPharmacist(pharmacistId);
    }

    //메시지 전송 시 DB에 저장
    @Transactional
    public void saveMessage(ChatMessageDto chatMessageDto) {
        log.info("메시지 저장 시도 - 방번호: {}, 보낸이ID: {}, 타입: {}",
                chatMessageDto.getRoomId(), chatMessageDto.getSenderId(), chatMessageDto.getSenderType());

        ConsultationSession session = consultationSessionRepository.findById(chatMessageDto.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다."));

        ConsultationMessage message = ConsultationMessage.createMessage(
                session,
                chatMessageDto.getSenderId(),
                chatMessageDto.getSenderType(),
                chatMessageDto.getMessage()
        );

        consultationMessageRepository.save(message);
    }

    //과거 대화 내역 조회
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistoryMessage(Long roomId) {
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다"));

        List<ConsultationMessage> messages = consultationMessageRepository.findBySessionOrderByCreatedAtAsc(session);

        return messages.stream()
                .map(msg -> ChatMessageResponse.builder()
                        .messageId(msg.getId())
                        .senderId(msg.getSenderId())
                        .senderType(msg.getSenderType())
                        .content(msg.getContent())
                        .createdAt(msg.getCreatedAt())
                        .build())
                .toList();
    }

    //약사 대기중인 상담 목록 조회
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getPendingRooms(String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }

        List<ConsultationSession> pendingSessions = consultationSessionRepository.findByStatus(SessionStatus.PENDING);
        return pendingSessions.stream().map(this::convertToResponse).toList();
    }

    //약사 상담 진행 중 목록
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getActiveRooms(Long pharmacistId, String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }
        return consultationSessionRepository.findByPharmacistIdAndStatus(pharmacistId, SessionStatus.MATCHED)
                .stream().map(this::convertToResponse).toList();
    }

    //약사 완료된 상담 목록
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getCompletedRooms(Long pharmacistId, String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }
        return consultationSessionRepository.findByPharmacistIdAndStatus(pharmacistId, SessionStatus.CLOSED)
                .stream().map(this::convertToResponse).toList();
    }

    // 일반 유저 본인 상담 목록 조회
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getUserRooms(Long userId, String role) {
        if (!"USER".equals(role) && !"ROLE_USER".equals(role)) {
            throw new IllegalArgumentException("일반 유저만 조회 가능합니다");
        }
        return consultationSessionRepository.findByCustomerId(userId)
                .stream().map(this::convertToResponse).toList();
    }

    // 약사가 상담 중 환자 정보 조회
    @Transactional(readOnly = true)
    public PatientInfoResponse getPatientInfoByRoomId(Long roomId, String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 환자 정보를 조회할 수 있습니다");
        }

        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다"));

        return authUserClient.getPatientInfo(session.getCustomerId());
    }

    //상담 종료 처리
    @Transactional
    public void closeRoom(Long roomId, Long requesterId, String role) {
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다"));

        //약사가 상담 종료 요청한 경우
        if ("PHARMACIST".equals(role) || "ROLE_PHARMACIST".equals(role)) {
            if (!requesterId.equals(session.getPharmacistId())) {
                throw new IllegalArgumentException("본인 상담만 종료할 수 있습니다");
            }
        }

        //일반 유저가 상담 종료 요청한 경우
        else if ("USER".equals(role) || "ROLE_USER".equals(role)) {
            if (!requesterId.equals(session.getCustomerId())) {
                throw new IllegalArgumentException("본인의 상담만 종료 가능합니다");
            }
        } else {
            throw new IllegalArgumentException("삭제할 권한이 없습니다");
        }
        session.closeSession();
    }

    //종료된 상담 피드백 및 별점 등록
    @Transactional
    public void saveFeedback(Long roomId, ConsultationFeedbackRequest consultationFeedbackRequest) {
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상담방입니다"));

        if (consultationFeedbackRepository.existsBySession(session)) {
            throw new IllegalStateException("이미 평가가 완료된 상담입니다");
        }

        ConsultationFeedback feedback = ConsultationFeedback.createFeedback(
                session,
                session.getPharmacistId(),
                consultationFeedbackRequest.getRating(),
                consultationFeedbackRequest.getComment()
        );

        consultationFeedbackRepository.save(feedback);
    }

    //약사 평점 및 후기 통계 조회
    @Transactional(readOnly = true)
    public PharmacistFeedbackStatsResponse getPharmacistFeedbackStats(Long pharmacistId, String role) {
        if (!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }

        //평균 평점 및 리뷰 수 조회
        Double rawAvgRating = consultationFeedbackRepository.getAverageRatingByPharmacistId(pharmacistId);

        //소수점 첫째자리까지 포맷팅
        Double averageRating = rawAvgRating != null ? Math.round(rawAvgRating * 10.0) / 10.0 : 0.0;
        Long totalReviewCount = consultationFeedbackRepository.countByPharmacistId(pharmacistId);

        //가장 최신 완료된 리뷰 3개 조회
        List<ConsultationRoomResponse> recentFeedbacks = consultationSessionRepository
                .findByPharmacistIdAndStatus(pharmacistId, SessionStatus.CLOSED)
                .stream()
                .map(this::convertToResponse)
                .filter(res -> res.getRating() != null)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(3)
                .toList();

        return PharmacistFeedbackStatsResponse.builder()
                .averageRating(averageRating)
                .totalReviewCount(totalReviewCount)
                .recentFeedbacks(recentFeedbacks)
                .build();
    }

    //약사 상담 중 AI 답변 가이드 요청
    @Transactional
    public void aiAnswerGuide(Long roomId) {
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("방을 찾을 수 없습니다"));

        List<ConsultationMessage> messages = consultationMessageRepository.findBySessionOrderByCreatedAtAsc(session);

        String formattedLog = messages.stream()
                .map(m -> String.format("[%s]: %s", m.getSenderType(), m.getContent()))
                .collect(Collectors.joining("\n"));

        session.updateChatLog(formattedLog);
    }

    //약사 상담 AI 답변 가이드 받음
    @Transactional
    public void updateAiGuide(Long roomId, String guideText) {
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("방을 찾을 수 없습니다."));
        session.updateAiAnswerGuide(guideText);
    }




}
