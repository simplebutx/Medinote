package com.ibmteam02.backend_medication.smartpill.service;

import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleMedicine;
import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import com.ibmteam02.backend_medication.schedule.repository.MedicationScheduleTimeRepository;
import com.ibmteam02.backend_medication.smartpill.domain.SmartPillDevice;
import com.ibmteam02.backend_medication.smartpill.domain.SmartPillSlotAssignment;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillDeviceResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotAssignmentResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotAssignmentSaveRequest;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotAssignmentSlotResponse;
import com.ibmteam02.backend_medication.smartpill.dto.SmartPillSlotScheduleTimeResponse;
import com.ibmteam02.backend_medication.smartpill.repository.SmartPillDeviceRepository;
import com.ibmteam02.backend_medication.smartpill.repository.SmartPillSlotAssignmentRepository;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SmartPillAssignmentService {

    private static final int MIN_SLOT_NUMBER = 1;
    private static final int MAX_SLOT_NUMBER = 4;

    private final SmartPillDeviceRepository smartPillDeviceRepository;
    private final SmartPillSlotAssignmentRepository smartPillSlotAssignmentRepository;
    private final MedicationScheduleTimeRepository medicationScheduleTimeRepository;

    // 내 장치 불러오기
    @Transactional(readOnly = true)
    public List<SmartPillDeviceResponse> getDevices(Long userId) {
        requireUser(userId);

        return smartPillDeviceRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDeviceResponse)
                .toList();
    }

    // 장치에 연결된 처방전/복약시간 가져오기
    @Transactional(readOnly = true)
    public SmartPillSlotAssignmentResponse getAssignments(Long userId, String deviceId) {
        SmartPillDevice device = findDevice(userId, deviceId);
        return toAssignmentResponse(device);
    }

    // 각 칸에 몇시의 약을 집어넣을지 연결
    public SmartPillSlotAssignmentResponse saveAssignments(
            Long userId,
            String deviceId,
            SmartPillSlotAssignmentSaveRequest request
    ) {
        requireUser(userId);
        SmartPillDevice device = findOrCreateDevice(userId, deviceId, request.name());
        device.updateName(request.name());
        device.pauseDetection();

        smartPillSlotAssignmentRepository.deleteByDevice_Id(device.getId());

        for (var slot : emptyListIfNull(request.slots())) {
            int slotNumber = normalizeSlotNumber(slot.slotNumber());
            for (Long scheduleTimeId : emptyListIfNull(slot.medicationScheduleTimeIds())) {
                MedicationScheduleTime scheduleTime = findScheduleTime(userId, scheduleTimeId);
                smartPillSlotAssignmentRepository.save(
                        SmartPillSlotAssignment.builder()
                                .device(device)
                                .slotNumber(slotNumber)
                                .medicationScheduleTime(scheduleTime)
                                .build()
                );
            }
        }

        return toAssignmentResponse(device);
    }

    // 장치 복약 측정 시작
    public SmartPillSlotAssignmentResponse startDetection(Long userId, String deviceId) {
        SmartPillDevice device = findDevice(userId, deviceId);
        device.startDetection();
        return toAssignmentResponse(device);
    }

    // 장치 복약 측정 중지
    public SmartPillSlotAssignmentResponse pauseDetection(Long userId, String deviceId) {
        SmartPillDevice device = findDevice(userId, deviceId);
        device.pauseDetection();
        return toAssignmentResponse(device);
    }

    // 장치 복약 측정 초기화
    public SmartPillSlotAssignmentResponse resetAssignments(Long userId, String deviceId) {
        SmartPillDevice device = findDevice(userId, deviceId);
        device.pauseDetection();
        smartPillSlotAssignmentRepository.deleteByDevice_Id(device.getId());
        return toAssignmentResponse(device);
    }

    private SmartPillDevice findOrCreateDevice(Long userId, String deviceId, String name) {
        return smartPillDeviceRepository.findByDeviceId(deviceId)
                .map((device) -> {
                    if (!device.getUserId().equals(userId)) {
                        throw new ResourceNotFoundException("Smart pill device not found");
                    }
                    return device;
                })
                .orElseGet(() -> smartPillDeviceRepository.save(
                        SmartPillDevice.builder()
                                .deviceId(deviceId)
                                .userId(userId)
                                .name(name == null || name.isBlank() ? deviceId : name)
                                .build()
                ));
    }

    // userId가 소유한 특정 장치 가져오기
    private SmartPillDevice findDevice(Long userId, String deviceId) {
        requireUser(userId);
        return smartPillDeviceRepository.findByDeviceIdAndUserId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Smart pill device not found"));
    }

    private MedicationScheduleTime findScheduleTime(Long userId, Long scheduleTimeId) {
        MedicationScheduleTime scheduleTime = medicationScheduleTimeRepository.findById(scheduleTimeId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication schedule time not found"));

        if (!scheduleTime.getMedicationScheduleMedicine().getMedicationSchedule().getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Medication schedule time not found");
        }

        return scheduleTime;
    }

    private SmartPillSlotAssignmentResponse toAssignmentResponse(SmartPillDevice device) {
        List<SmartPillSlotAssignment> assignments =
                smartPillSlotAssignmentRepository.findByDeviceDeviceIdOrderBySlotNumberAscIdAsc(device.getDeviceId());
        Map<Integer, List<SmartPillSlotAssignment>> grouped = assignments.stream()
                .collect(
                        LinkedHashMap::new,
                        (map, assignment) -> map.computeIfAbsent(assignment.getSlotNumber(), ignored -> new java.util.ArrayList<>()).add(assignment),
                        LinkedHashMap::putAll
                );

        List<SmartPillSlotAssignmentSlotResponse> slots = grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map((entry) -> {
                    List<SmartPillSlotScheduleTimeResponse> scheduleTimes = entry.getValue().stream()
                            .sorted(Comparator.comparing((SmartPillSlotAssignment assignment) ->
                                    assignment.getMedicationScheduleTime().getTakeTime()))
                            .map((assignment) -> toScheduleTimeResponse(assignment.getMedicationScheduleTime()))
                            .toList();
                    LocalTime takeTime = scheduleTimes.isEmpty() ? null : scheduleTimes.get(0).takeTime();
                    return new SmartPillSlotAssignmentSlotResponse(entry.getKey(), takeTime, scheduleTimes);
                })
                .toList();

        return new SmartPillSlotAssignmentResponse(
                device.getDeviceId(),
                device.getName(),
                device.getActiveDetection(),
                device.getDetectionStartedAt(),
                slots
        );
    }

    private SmartPillSlotScheduleTimeResponse toScheduleTimeResponse(MedicationScheduleTime scheduleTime) {
        MedicationScheduleMedicine medicine = scheduleTime.getMedicationScheduleMedicine();
        return new SmartPillSlotScheduleTimeResponse(
                scheduleTime.getId(),
                medicine.getId(),
                medicine.getCustomMedicineName(),
                scheduleTime.getTakeTime()
        );
    }

    private SmartPillDeviceResponse toDeviceResponse(SmartPillDevice device) {
        return new SmartPillDeviceResponse(
                device.getId(),
                device.getDeviceId(),
                device.getName(),
                device.getActiveDetection(),
                device.getDetectionStartedAt(),
                device.getCreatedAt(),
                device.getUpdatedAt()
        );
    }

    private int normalizeSlotNumber(Integer slotNumber) {
        if (slotNumber == null || slotNumber < MIN_SLOT_NUMBER || slotNumber > MAX_SLOT_NUMBER) {
            throw new IllegalArgumentException("slotNumber must be between 1 and 4");
        }
        return slotNumber;
    }

    private void requireUser(Long userId) {
        if (userId == null) {
            throw new ResourceNotFoundException("User not found");
        }
    }

    private <T> List<T> emptyListIfNull(List<T> source) {
        return source == null ? List.of() : source;
    }
}
