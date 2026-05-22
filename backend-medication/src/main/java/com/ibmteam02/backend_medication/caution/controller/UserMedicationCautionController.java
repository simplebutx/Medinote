package com.ibmteam02.backend_medication.caution.controller;

import com.ibmteam02.backend_medication.caution.dto.CautionSuggestionResponse;
import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionRequest;
import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionResponse;
import com.ibmteam02.backend_medication.caution.service.UserMedicationCautionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/cautions")
@RequiredArgsConstructor
public class UserMedicationCautionController {

    private final UserMedicationCautionService userMedicationCautionService;

    // 자동완성
    @PostMapping("/suggest")
    public List<CautionSuggestionResponse> suggest(
            @RequestParam String keyword,
            @RequestParam String type
    ) {
        return userMedicationCautionService.suggest(keyword, type);
    }

    // 내 주의 약·성분 등록
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserMedicationCautionResponse create(
            @AuthenticationPrincipal Long userId,
            @RequestBody UserMedicationCautionRequest request
    ) {
        return userMedicationCautionService.create(userId, request);
    }

    // 내 주의 약·성분 목록 조회
    @GetMapping
    public List<UserMedicationCautionResponse> getList(@AuthenticationPrincipal Long userId) {
        return userMedicationCautionService.getList(userId);
    }

    // 내 주의 약·성분 상세 조회
    @GetMapping("/{id}")
    public UserMedicationCautionResponse getDetail(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id
    ) {
        return userMedicationCautionService.getDetail(userId, id);
    }

    // 내 주의 약·성분 수정
    @PatchMapping("/{id}")
    public UserMedicationCautionResponse update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody UserMedicationCautionRequest request
    ) {
        return userMedicationCautionService.update(userId, id, request);
    }

    // 내 주의 약·성분 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id
    ) {
        userMedicationCautionService.delete(userId, id);
    }
}
