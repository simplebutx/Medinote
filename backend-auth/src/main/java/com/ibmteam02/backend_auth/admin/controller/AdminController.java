package com.ibmteam02.backend_auth.admin.controller;

import com.ibmteam02.backend_auth.admin.dto.PharmacistApprovalResponse;
import com.ibmteam02.backend_auth.admin.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;

    //승인 대기 중인 약사 목록 조회
    @GetMapping("/pharmacists/pending")
    public ResponseEntity<List<PharmacistApprovalResponse>> getPendingPharmacists(){
        List<PharmacistApprovalResponse> pendingList = adminService.getPendingPharmacists();
        return ResponseEntity.ok(pendingList);
    }

}
