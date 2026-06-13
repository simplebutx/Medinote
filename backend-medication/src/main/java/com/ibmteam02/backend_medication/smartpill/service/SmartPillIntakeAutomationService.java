package com.ibmteam02.backend_medication.smartpill.service;

import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeLog;
import com.ibmteam02.backend_medication.schedule.domain.MedicationIntakeStatus;
import com.ibmteam02.backend_medication.schedule.domain.MedicationSchedule;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.repository.MedicationIntakeLogRepository;
import com.ibmteam02.backend_medication.smartpill.domain.SmartPillDevice;
import com.ibmteam02.backend_medication.smartpill.domain.SmartPillSlotAssignment;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotState;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillStatusResponse;
import com.ibmteam02.backend_medication.smartpill.repository.SmartPillDeviceRepository;
import com.ibmteam02.backend_medication.smartpill.repository.SmartPillSlotAssignmentRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SmartPillIntakeAutomationService {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");
    private static final long ACCEPT_BEFORE_MINUTES = 120;
    private static final long ACCEPT_AFTER_MINUTES = 240;
    private static final int STABLE_SAMPLE_COUNT = 2;

    private final SmartPillSlotAssignmentRepository smartPillSlotAssignmentRepository;
    private final SmartPillDeviceRepository smartPillDeviceRepository;
    private final MedicationIntakeLogRepository medicationIntakeLogRepository;
    private final Map<String, SlotPresenceState> slotPresenceStates = new HashMap<>();

    public synchronized void handleStatusTransition(
            String deviceId,
            SmartPillStatusResponse previous,
            SmartPillStatusResponse current
    ) {
        if (deviceId == null || deviceId.isBlank() || current == null) {
            return;
        }

        SmartPillDevice device = smartPillDeviceRepository.findByDeviceId(deviceId).orElse(null);
        if (device == null || !device.isDetectionActive()) {
            clearDeviceStates(deviceId);
            return;
        }

        LocalDateTime takenAt = current.receivedAt() == null
                ? LocalDateTime.now(SCHEDULE_ZONE)
                : current.receivedAt();

        for (SmartPillSlotState currentSlot : emptyListIfNull(current.slots())) {
            if (!isValidSlotState(currentSlot)) {
                continue;
            }

            String stateKey = deviceId + ":" + currentSlot.slotNumber();
            SlotPresenceState state = slotPresenceStates.computeIfAbsent(stateKey, ignored -> new SlotPresenceState());
            if (state.updateAndIsTakenTransition(currentSlot.pillPresent())) {
                createTakenLogsForSlot(deviceId, currentSlot.slotNumber(), takenAt);
            }
        }
    }

    private void createTakenLogsForSlot(String deviceId, Integer slotNumber, LocalDateTime takenAt) {
        List<SmartPillSlotAssignment> assignments =
                smartPillSlotAssignmentRepository.findByDeviceDeviceIdAndSlotNumberOrderByIdAsc(deviceId, slotNumber);

        for (SmartPillSlotAssignment assignment : assignments) {
            MedicationScheduleTime scheduleTime = assignment.getMedicationScheduleTime();
            LocalDateTime scheduledAt = resolveScheduledAt(scheduleTime, takenAt);

            if (scheduledAt == null || hasTakenLog(scheduleTime.getId(), scheduledAt)) {
                continue;
            }

            MedicationSchedule schedule = scheduleTime.getMedicationScheduleMedicine().getMedicationSchedule();
            MedicationIntakeLog intakeLog = MedicationIntakeLog.builder()
                    .medicationSchedule(schedule)
                    .medicationScheduleTime(scheduleTime)
                    .status(MedicationIntakeStatus.TAKEN)
                    .scheduledAt(scheduledAt)
                    .takenAt(takenAt)
                    .build();
            medicationIntakeLogRepository.save(intakeLog);

            log.info(
                    "SmartPill auto intake log created: deviceId={}, slotNumber={}, scheduleTimeId={}, scheduledAt={}, takenAt={}",
                    deviceId,
                    slotNumber,
                    scheduleTime.getId(),
                    scheduledAt,
                    takenAt
            );
        }
    }

    private LocalDateTime resolveScheduledAt(MedicationScheduleTime scheduleTime, LocalDateTime takenAt) {
        LocalDate baseDate = takenAt.toLocalDate();

        return List.of(
                        baseDate.minusDays(1).atTime(scheduleTime.getTakeTime()),
                        baseDate.atTime(scheduleTime.getTakeTime()),
                        baseDate.plusDays(1).atTime(scheduleTime.getTakeTime())
                )
                .stream()
                .min(Comparator.comparing((candidate) -> Math.abs(Duration.between(candidate, takenAt).toMinutes())))
                .filter((candidate) -> isInsideAcceptWindow(candidate, takenAt))
                .orElse(null);
    }

    private boolean isInsideAcceptWindow(LocalDateTime scheduledAt, LocalDateTime takenAt) {
        long minutes = Duration.between(scheduledAt, takenAt).toMinutes();
        return minutes >= -ACCEPT_BEFORE_MINUTES && minutes <= ACCEPT_AFTER_MINUTES;
    }

    private boolean hasTakenLog(Long scheduleTimeId, LocalDateTime scheduledAt) {
        LocalDateTime dayStart = scheduledAt.toLocalDate().atStartOfDay();
        LocalDateTime nextDayStart = dayStart.plusDays(1);
        return medicationIntakeLogRepository
                .existsByMedicationScheduleTime_IdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanAndStatus(
                        scheduleTimeId,
                        dayStart,
                        nextDayStart,
                        MedicationIntakeStatus.TAKEN
                );
    }

    private boolean isValidSlotState(SmartPillSlotState slot) {
        return slot.slotNumber() != null
                && Boolean.TRUE.equals(slot.sensorReady())
                && slot.pillPresent() != null;
    }

    private <T> List<T> emptyListIfNull(List<T> source) {
        return source == null
                ? List.of()
                : source.stream().filter(Objects::nonNull).toList();
    }

    private void clearDeviceStates(String deviceId) {
        slotPresenceStates.keySet().removeIf((key) -> key.startsWith(deviceId + ":"));
    }

    private static class SlotPresenceState {
        private Boolean stablePresent;
        private Boolean lastObservedPresent;
        private int sameSampleCount;

        boolean updateAndIsTakenTransition(Boolean observedPresent) {
            if (!observedPresent.equals(lastObservedPresent)) {
                lastObservedPresent = observedPresent;
                sameSampleCount = 1;
                return false;
            }

            sameSampleCount++;

            if (sameSampleCount < STABLE_SAMPLE_COUNT) {
                return false;
            }

            if (stablePresent == null) {
                stablePresent = observedPresent;
                return false;
            }

            boolean takenTransition = Boolean.TRUE.equals(stablePresent) && Boolean.FALSE.equals(observedPresent);
            stablePresent = observedPresent;
            return takenTransition;
        }
    }
}
