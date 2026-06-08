package com.ibmteam02.backend_consultation.consultation.controller;

import com.ibmteam02.backend_consultation.ai.dto.AiConsultationSummaryRequest;
import com.ibmteam02.backend_consultation.consultation.dto.*;
import com.ibmteam02.backend_consultation.consultation.service.ConsultationService;
import com.ibmteam02.backend_consultation.global.auth.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/app/consult")
public class ConsultationController {

    private final ConsultationService consultationService;
    private final JwtProvider jwtProvider;

    //일반 유저 상담 신청 -> 대화방 생성
    @PostMapping("/room")
    public ResponseEntity<?> createRoom(@RequestHeader("Authorization") String bearerToken){
        try {
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            Long roomId = consultationService.createRoom(userId, role);
            return ResponseEntity.ok(roomId);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("상담방 생성 실패: " + e.getMessage());
        }
    }

    //약사 대화방 매칭
    @PostMapping("/room/{roomId}/match")
    public ResponseEntity<?> matchPharmacist(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String bearerToken){
        try {
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            consultationService.matchPharmacist(roomId, userId, role);
            return ResponseEntity.ok("약사 1:1 문의 매칭 완료");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("매칭 실패: " + e.getMessage());
        }
    }

    //상담 과거 대화 내역 조회
    @GetMapping("/room/{roomId}/messages")
    public ResponseEntity<?> getHistoryMessage(@PathVariable Long roomId){
        try {
            List<ChatMessageResponse> history = consultationService.getHistoryMessage(roomId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("대화 내역 조회 실패: " + e.getMessage());
        }
    }

    //약사 대기중인 상담 목록 조회
    @GetMapping("/rooms/pending")
    public ResponseEntity<?> getPendingRooms(
            @RequestHeader("Authorization") String bearerToken){
        try {
            String token = bearerToken.substring(7);
            String role = jwtProvider.getRoleFromToken(token);

            List<ConsultationRoomResponse> pendingRooms = consultationService.getPendingRooms(role);
            return ResponseEntity.ok(pendingRooms);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("서버 내부 에러 발생: " + e.getMessage());
        }
    }

    //약사 상담 진행 중 목록
    @GetMapping("/rooms/active")
    public ResponseEntity<?> getActiveRooms(@RequestHeader("Authorization") String bearerToken){
        try{
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            return ResponseEntity.ok(consultationService.getActiveRooms(userId,role));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    //약사 상담 완료된 목록
    @GetMapping("/rooms/completed")
    public ResponseEntity<?> getCompletedRooms(@RequestHeader("Authorization") String bearerToken){
        try{
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            return ResponseEntity.ok(consultationService.getCompletedRooms(userId,role));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // 일반 유저 본인 상담 목록 조회
    @GetMapping("/rooms/my")
    public ResponseEntity<?> getMyRooms(@RequestHeader("Authorization") String bearerToken) {
        try {
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            return ResponseEntity.ok(consultationService.getUserRooms(userId, role));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    //약사 상담 종료
    @PatchMapping("/room/{roomId}/close")
    public ResponseEntity<?> closeRoom(@PathVariable Long roomId,@RequestHeader("Authorization") String bearerToken){
        try{
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            consultationService.closeRoom(roomId, userId, role);
            return ResponseEntity.ok("상담이 성공적으로 종료되었습니다.");
        } catch (Exception e){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // 약사가 상담 중 환자 정보 조회
    @GetMapping("/room/{roomId}/patient-info")
    public ResponseEntity<?> getPatientInfo(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String bearerToken) {
        try {
            String token = bearerToken.substring(7);
            String role = jwtProvider.getRoleFromToken(token);

            PatientInfoResponse patientInfo = consultationService.getPatientInfoByRoomId(roomId, role);
            return ResponseEntity.ok(patientInfo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    //종료된 상담 피드백 및 별점 등록
    @PostMapping("/room/{roomId}/feedback")
    public ResponseEntity<?> saveFeedback(
            @PathVariable Long roomId,
            @RequestBody ConsultationFeedbackRequest consultationFeedbackRequest){
        try{
            consultationService.saveFeedback(roomId,consultationFeedbackRequest);
            return ResponseEntity.ok("평가가 성공적으로 등록되었습니다");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("평가 등록 실패" + e.getMessage());
        }
    }

    // 약사 평점 및 피드백 통계 조회
    @GetMapping("/rooms/feedback-stats")
    public ResponseEntity<?> getPharmacistFeedbackStats(@RequestHeader("Authorization") String bearerToken){
        try{
            String token = bearerToken.substring(7);
            Long userId = jwtProvider.getUserIdFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);

            PharmacistFeedbackStatsResponse stats = consultationService.getPharmacistFeedbackStats(userId,role);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("통계 조회 실패:" + e.getMessage());
        }
    }

    //상담 요약 요청
    @PostMapping("/room/{roomId}/summary")
    public ResponseEntity<?> requestAiGuide(@PathVariable Long roomId){
        try{
            consultationService.aiConsultationSummary(roomId);
            return ResponseEntity.ok("AI 분석을 위해 대화 전체 수집 완료");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("요청 실패"+e.getMessage());
        }
    }
}
