package com.ibmteam02.backend_medication.caution.controller;

import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionResponse;
import com.ibmteam02.backend_medication.caution.service.UserMedicationCautionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/user-medication-cautions")
@RequiredArgsConstructor
public class UserMedicationCautionInternalController {

    private final UserMedicationCautionService userMedicationCautionService;

    // 특정 유저의 주의 약물/성분 목록 조회 (서버 간 통신용)
    @GetMapping
    public List<UserMedicationCautionResponse> getCautionsByUserId(@RequestParam("userId") Long userId) {
        return userMedicationCautionService.getList(userId);
    }
}
