package com.ibmteam02.backend_consultation.notification.controller;

import com.ibmteam02.backend_consultation.global.auth.JwtProvider;
import com.ibmteam02.backend_consultation.notification.dto.ConsultationNotificationResponse;
import com.ibmteam02.backend_consultation.notification.service.ConsultationNotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/consultation-notifications")
@RequiredArgsConstructor
public class ConsultationNotificationController {

    private final ConsultationNotificationService consultationNotificationService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public List<ConsultationNotificationResponse> getList(@RequestHeader("Authorization") String bearerToken) {
        return consultationNotificationService.getList(extractUserId(bearerToken));
    }

    @PatchMapping("/{id}/read")
    public ConsultationNotificationResponse markRead(
            @RequestHeader("Authorization") String bearerToken,
            @PathVariable Long id
    ) {
        return consultationNotificationService.markRead(extractUserId(bearerToken), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader("Authorization") String bearerToken, @PathVariable Long id) {
        consultationNotificationService.delete(extractUserId(bearerToken), id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(@RequestHeader("Authorization") String bearerToken) {
        consultationNotificationService.deleteAll(extractUserId(bearerToken));
    }

    private Long extractUserId(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Authorization header is required.");
        }

        return jwtProvider.getUserIdFromToken(bearerToken.substring(7));
    }
}
