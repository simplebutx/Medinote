package com.ibmteam02.backend_consultation.notification.controller;

import com.ibmteam02.backend_consultation.notification.dto.ConsultationNotificationResponse;
import com.ibmteam02.backend_consultation.notification.service.ConsultationNotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/consultation-notifications")
@RequiredArgsConstructor
public class ConsultationNotificationController {

    private final ConsultationNotificationService consultationNotificationService;

    @GetMapping
    public List<ConsultationNotificationResponse> getList(Authentication authentication) {
        return consultationNotificationService.getList(extractUserId(authentication));
    }

    @PatchMapping("/{id}/read")
    public ConsultationNotificationResponse markRead(
            Authentication authentication,
            @PathVariable Long id
    ) {
        return consultationNotificationService.markRead(extractUserId(authentication), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        consultationNotificationService.delete(extractUserId(authentication), id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(Authentication authentication) {
        consultationNotificationService.deleteAll(extractUserId(authentication));
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization header is required.");
        }

        return userId;
    }
}
