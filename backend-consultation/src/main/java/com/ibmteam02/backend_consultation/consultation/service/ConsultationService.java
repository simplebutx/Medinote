package com.ibmteam02.backend_consultation.consultation.service;

import com.ibmteam02.backend_consultation.consultation.domain.ConsultationMessage;
import com.ibmteam02.backend_consultation.consultation.domain.ConsultationSession;
import com.ibmteam02.backend_consultation.consultation.domain.SessionStatus;
import com.ibmteam02.backend_consultation.consultation.dto.ChatMessageDto;
import com.ibmteam02.backend_consultation.consultation.dto.ChatMessageResponse;
import com.ibmteam02.backend_consultation.consultation.dto.ConsultationRoomResponse;
import com.ibmteam02.backend_consultation.consultation.dto.PatientInfoResponse;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationFeedbackRepository;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationMessageRepository;
import com.ibmteam02.backend_consultation.consultation.repository.ConsultationSessionRepository;
import com.ibmteam02.backend_consultation.global.auth.AuthUserClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationService {
    private final ConsultationSessionRepository consultationSessionRepository;
    private final ConsultationMessageRepository consultationMessageRepository;
    private final ConsultationFeedbackRepository consultationFeedbackRepository;
    private final AuthUserClient authUserClient;

    // 공통 변환 메서드
    public ConsultationRoomResponse convertToResponse(ConsultationSession session){
        //일반 유저 username 가져오기
        String customerName = authUserClient.getCustomerName(session.getCustomerId());

        String firstMessage = consultationMessageRepository.findBySessionOrderByCreatedAtAsc(session)
                .stream()
                .findFirst()
                .map(ConsultationMessage::getContent)
                .orElse("상담 요청 메시지가 없습니다");

        return ConsultationRoomResponse.builder()
                .roomId(session.getId())
                .customId(session.getCustomerId())
                .status(session.getStatus().name())
                .createdAt(session.getCreatedAt())
                .firstMessage(firstMessage)
                .customerName(customerName)
                .build();
    }

    //일반유저가 상담 신청 -> 대화방 생성
    @Transactional
    public Long createRoom(Long customerId, String role){
        if(!"USER".equals(role) && !"ROLE_USER".equals(role)){
            throw new IllegalArgumentException("일반 유저 회원 기능입니다");
        }
        ConsultationSession session = ConsultationSession.createSession(customerId);
        ConsultationSession savedSession = consultationSessionRepository.save(session);
        return savedSession.getId();
    }

    //약사 상담방 매칭
    @Transactional
    public void matchPharmacist(Long roomId, Long pharmacistId, String role){
        if(!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)){
            throw new IllegalArgumentException("약사만 상담 수락이 가능합니다");
        }

        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(()->new IllegalArgumentException("존재하지 않는 방입니다"));

        session.matchPharmacist(pharmacistId);
    }

    //메시지 전송 시 DB에 저장
    @Transactional
    public void saveMessage(ChatMessageDto chatMessageDto){
        log.info("메시지 저장 시도 - 방번호: {}, 보낸이ID: {}, 타입: {}", 
                chatMessageDto.getRoomId(), chatMessageDto.getSenderId(), chatMessageDto.getSenderType());

        ConsultationSession session = consultationSessionRepository.findById(chatMessageDto.getRoomId())
                .orElseThrow(()-> new IllegalArgumentException("존재하지 않는 방입니다."));

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
    public List<ChatMessageResponse> getHistoryMessage(Long roomId){
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(()->new IllegalArgumentException("존재하지 않는 방입니다"));

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
    public List<ConsultationRoomResponse> getPendingRooms(String role){
        if(!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)) {
            throw  new IllegalArgumentException("약사만 조회 가능합니다");
        }

        List<ConsultationSession> pendingSessions = consultationSessionRepository.findByStatus(SessionStatus.PENDING);
        return pendingSessions.stream().map(this::convertToResponse).toList();
    }

    //약사 상담 진행 중 목록
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getActiveRooms(Long pharmacistId, String role){
        if(!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)){
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }
        return consultationSessionRepository.findByPharmacistIdAndStatus(pharmacistId, SessionStatus.MATCHED)
                .stream().map(this::convertToResponse).toList();
    }

    //약사 완료된 상담 목록
    @Transactional(readOnly = true)
    public List<ConsultationRoomResponse> getCompletedRooms(Long pharmacistId, String role){
        if(!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)){
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
    public void closeRoom(Long roomId, Long pharmacistId, String role){
        if(!"PHARMACIST".equals(role) && !"ROLE_PHARMACIST".equals(role)){
            throw new IllegalArgumentException("약사만 조회 가능합니다");
        }
        ConsultationSession session = consultationSessionRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다"));
        
        if(!pharmacistId.equals(session.getPharmacistId())){
            throw new IllegalArgumentException("본인이 담당한 상담만 종료할 수 있습니다");
        }
        session.closeSession();
    }
}
