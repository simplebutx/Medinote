package com.ibmteam02.backend_medication.caution.controller;

import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionRequest;
import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionResponse;
import com.ibmteam02.backend_medication.caution.service.UserMedicationCautionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/users/{userId}/cautions")
@RequiredArgsConstructor
public class UserMedicationCautionInternalController {

    private final UserMedicationCautionService userMedicationCautionService;

    @PostMapping
    public List<UserMedicationCautionResponse> createAll(
            @PathVariable Long userId,
            @RequestBody List<UserMedicationCautionRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        return requests.stream()
                .map(request -> userMedicationCautionService.create(userId, request))
                .toList();
    }
}
