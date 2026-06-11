package com.ibmteam02.backend_medication.smartpill.controller;

import com.ibmteam02.backend_medication.smartpill.dto.SmartPillIntakeTestRequest;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillIntakeTestResponse;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/smartpill/test")
public class SmartPillTestController {

    private static final Logger log = LoggerFactory.getLogger(SmartPillTestController.class);
    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @GetMapping("/health")
    public String health() {
        return "smartpill-test-ok";
    }

    @PostMapping("/intake-events")
    public SmartPillIntakeTestResponse receiveIntakeEvent(@RequestBody SmartPillIntakeTestRequest request) {
        LocalDateTime receivedAt = LocalDateTime.now(SCHEDULE_ZONE);

        log.info(
                "SmartPill test event received: deviceId={}, eventType={}, muxPort={}, distanceMm={}, pillPresent={}, uptimeMs={}, sequence={}",
                request.deviceId(),
                request.eventType(),
                request.muxPort(),
                request.distanceMm(),
                request.pillPresent(),
                request.uptimeMs(),
                request.sequence()
        );

        return new SmartPillIntakeTestResponse(
                "received",
                request.deviceId(),
                request.eventType(),
                request.muxPort(),
                request.distanceMm(),
                request.pillPresent(),
                request.uptimeMs(),
                request.sequence(),
                receivedAt
        );
    }
}
