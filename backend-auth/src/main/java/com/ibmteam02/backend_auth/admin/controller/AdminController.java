package com.ibmteam02.backend_auth.admin.controller;

import com.ibmteam02.backend_auth.admin.dto.AdminStatsResponse;
import com.ibmteam02.backend_auth.admin.dto.PharmacistApprovalResponse;
import com.ibmteam02.backend_auth.admin.dto.UserManagementResponse;
import com.ibmteam02.backend_auth.admin.service.AdminService;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final JwtProvider jwtProvider;

    //승인 대기 중인 약사 목록 조회
    @GetMapping("/pharmacists/pending")
    public ResponseEntity<List<PharmacistApprovalResponse>> getPendingPharmacists(
            @RequestHeader("Authorization") String bearerToken){
        
        String token = bearerToken.substring(7);
        String role = jwtProvider.getRoleFromToken(token);
        
        List<PharmacistApprovalResponse> pendingList = adminService.getPendingPharmacists(role);
        return ResponseEntity.ok(pendingList);
    }

    //약사 승인 처리
    @PostMapping("/pharmacists/{userId}/approve")
    public ResponseEntity<String> approvePharmacist(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String bearerToken){
        String token = bearerToken.substring(7);
        String role = jwtProvider.getRoleFromToken(token);

        adminService.approvePharmacist(userId,role);

        return ResponseEntity.ok("약사 승인 완료");
    }

    //약사 거절 처리
    @PostMapping("/pharmacists/{userId}/reject")
    public ResponseEntity<String> rejectPharmacist(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String bearerToken){
        String role = jwtProvider.getRoleFromToken(bearerToken.substring(7));

        adminService.rejectPharmacist(userId,role);

        return ResponseEntity.ok("거절 완료");
    }

    //전체 회원 목록 조회
    @GetMapping("/users")
    public ResponseEntity<List<UserManagementResponse>> getAllUsers(
            @RequestHeader("Authorization") String bearerToken){
        String token = bearerToken.substring(7);
        String role = jwtProvider.getRoleFromToken(token);

        return ResponseEntity.ok(adminService.getAllUsers(role));
    }

    //관리자용 회원 삭제(탈퇴)
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<String> deleteUser(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String bearerToken){
        String token = bearerToken.substring(7);
        String role = jwtProvider.getRoleFromToken(token);

        adminService.deleteUser(userId,role);
        return ResponseEntity.ok("회원이 정상적으로 삭제되었습니다");
    }

    //관리자 대시보드 명수 통계
    @GetMapping("stats")
    public ResponseEntity<AdminStatsResponse> getStats(
            @RequestHeader("Authorization") String bearerToken){
        String token = bearerToken.substring(7);
        String role = jwtProvider.getRoleFromToken(token);

        return ResponseEntity.ok(adminService.getStats(role));
    }

}
