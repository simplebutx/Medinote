package com.ibmteam02.backend_medication.smartpill.controller;

import com.ibmteam02.backend_medication.smartpill.dto.SmartPillIntakeTestRequest;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillIntakeTestResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotState;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillStatusResponse;
import com.ibmteam02.backend_medication.smartpill.service.SmartPillIntakeAutomationService;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final SmartPillIntakeAutomationService smartPillIntakeAutomationService;
    private final AtomicReference<SmartPillStatusResponse> latestStatus = new AtomicReference<>(
            new SmartPillStatusResponse(
                    "empty",
                    null,
                    null,
                    null,
                    null,
                    null,
                    0L,
                    defaultSlots(),
                    null,
                    null,
                    null
            )
    );

    public SmartPillTestController() {
        this(null);
    }

    @Autowired
    public SmartPillTestController(SmartPillIntakeAutomationService smartPillIntakeAutomationService) {
        this.smartPillIntakeAutomationService = smartPillIntakeAutomationService;
    }

    @GetMapping("/health")
    public String health() {
        return "smartpill-test-ok";
    }

    @GetMapping("/status")
    public SmartPillStatusResponse status() {
        return latestStatus.get();
    }

    @PostMapping("/intake-events")
    public SmartPillIntakeTestResponse receiveIntakeEvent(@RequestBody SmartPillIntakeTestRequest request) {
        LocalDateTime receivedAt = LocalDateTime.now(SCHEDULE_ZONE);
        SmartPillStatusResponse previous = latestStatus.get();
        List<SmartPillSlotState> slots = normalizeSlots(request);
        Long buttonClickCount = normalizeButtonClickCount(request, previous);

        log.info(
                "SmartPill test event received: deviceId={}, eventType={}, muxPort={}, distanceMm={}, pillPresent={}, buttonClickCount={}, slots={}, uptimeMs={}, sequence={}",
                request.deviceId(),
                request.eventType(),
                request.muxPort(),
                request.distanceMm(),
                request.pillPresent(),
                buttonClickCount,
                slots,
                request.uptimeMs(),
                request.sequence()
        );

        SmartPillStatusResponse status = new SmartPillStatusResponse(
                "received",
                request.deviceId(),
                request.eventType(),
                request.muxPort(),
                request.distanceMm(),
                request.pillPresent(),
                buttonClickCount,
                slots,
                request.uptimeMs(),
                request.sequence(),
                receivedAt
        );
        latestStatus.set(status);

        if (smartPillIntakeAutomationService != null) {
            smartPillIntakeAutomationService.handleStatusTransition(request.deviceId(), previous, status);
        }

        return new SmartPillIntakeTestResponse(
                "received",
                request.deviceId(),
                request.eventType(),
                request.muxPort(),
                request.distanceMm(),
                request.pillPresent(),
                buttonClickCount,
                slots,
                request.uptimeMs(),
                request.sequence(),
                receivedAt
        );
    }

    private static List<SmartPillSlotState> normalizeSlots(SmartPillIntakeTestRequest request) {
        if (request.slots() != null && !request.slots().isEmpty()) {
            return request.slots();
        }

        if (request.muxPort() == null && request.distanceMm() == null && request.pillPresent() == null) {
            return defaultSlots();
        }

        return List.of(
                new SmartPillSlotState(
                        1,
                        request.muxPort(),
                        true,
                        request.distanceMm(),
                        request.pillPresent()
                )
        );
    }

    private static Long normalizeButtonClickCount(
            SmartPillIntakeTestRequest request,
            SmartPillStatusResponse previous
    ) {
        if (request.buttonClickCount() != null) {
            return request.buttonClickCount();
        }

        long previousCount = previous.buttonClickCount() == null ? 0L : previous.buttonClickCount();
        if ("BUTTON_TEST".equals(request.eventType())) {
            return previousCount + 1;
        }

        return previousCount;
    }

    private static List<SmartPillSlotState> defaultSlots() {
        return List.of(
                new SmartPillSlotState(1, 3, false, null, false),
                new SmartPillSlotState(2, 4, false, null, false),
                new SmartPillSlotState(3, 6, false, null, false),
                new SmartPillSlotState(4, 7, false, null, false)
        );
    }
}
