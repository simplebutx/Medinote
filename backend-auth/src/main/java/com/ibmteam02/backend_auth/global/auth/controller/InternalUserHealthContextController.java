package com.ibmteam02.backend_auth.global.auth.controller;

import com.ibmteam02.backend_auth.global.auth.dto.InternalUserHealthContextRequest;
import com.ibmteam02.backend_auth.global.auth.dto.InternalUserHealthContextResponse;
import com.ibmteam02.backend_auth.global.auth.service.InternalUserHealthContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserHealthContextController {

    private final InternalUserHealthContextService internalUserHealthContextService;

    @PostMapping("/health-context")
    public InternalUserHealthContextResponse getHealthContext(
            @RequestBody InternalUserHealthContextRequest request
    ) {
        return internalUserHealthContextService.getHealthContext(request.userId());
    }
}
