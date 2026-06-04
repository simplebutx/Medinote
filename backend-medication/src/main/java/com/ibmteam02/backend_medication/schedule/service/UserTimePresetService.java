package com.ibmteam02.backend_medication.schedule.service;

import com.ibmteam02.backend_medication.schedule.domain.UserTimePreset;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetGroupRequest;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetGroupResponse;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetSaveRequest;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetSlotRequest;
import com.ibmteam02.backend_medication.schedule.dto.UserTimePresetSlotResponse;
import com.ibmteam02.backend_medication.schedule.repository.UserTimePresetRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserTimePresetService {

    private static final int MAX_TIMES_PER_DAY = 12;

    private final UserTimePresetRepository userTimePresetRepository;

    @Transactional(readOnly = true)
    public List<UserTimePresetGroupResponse> getPresets(Long userId) {
        return toResponse(userTimePresetRepository.findByUserIdOrderByTimesPerDayAscSortOrderAsc(userId));
    }

    public List<UserTimePresetGroupResponse> replacePresets(
            Long userId,
            UserTimePresetSaveRequest request
    ) {
        List<UserTimePreset> presetsToSave = new ArrayList<>();

        for (UserTimePresetGroupRequest group : safeGroups(request)) {
            validateTimesPerDay(group.timesPerDay());

            for (UserTimePresetSlotRequest slot : safeSlots(group)) {
                validateSlot(group.timesPerDay(), slot);

                presetsToSave.add(UserTimePreset.builder()
                        .userId(userId)
                        .timesPerDay(group.timesPerDay())
                        .sortOrder(slot.sortOrder())
                        .takeTime(slot.takeTime())
                        .build());
            }
        }

        userTimePresetRepository.deleteByUserId(userId);
        userTimePresetRepository.flush();
        if (!presetsToSave.isEmpty()) {
            userTimePresetRepository.saveAll(presetsToSave);
            userTimePresetRepository.flush();
        }

        return getPresets(userId);
    }

    private List<UserTimePresetGroupRequest> safeGroups(UserTimePresetSaveRequest request) {
        return request != null && request.presets() != null ? request.presets() : List.of();
    }

    private List<UserTimePresetSlotRequest> safeSlots(UserTimePresetGroupRequest group) {
        return group.slots() != null ? group.slots() : List.of();
    }

    private void validateTimesPerDay(Integer timesPerDay) {
        if (timesPerDay == null || timesPerDay < 1 || timesPerDay > MAX_TIMES_PER_DAY) {
            throw new IllegalArgumentException("timesPerDay must be between 1 and 12.");
        }
    }

    private void validateSlot(Integer timesPerDay, UserTimePresetSlotRequest slot) {
        if (slot.sortOrder() == null || slot.sortOrder() < 1 || slot.sortOrder() > timesPerDay) {
            throw new IllegalArgumentException("sortOrder must be between 1 and timesPerDay.");
        }

        if (slot.takeTime() == null) {
            throw new IllegalArgumentException("takeTime is required.");
        }
    }

    private List<UserTimePresetGroupResponse> toResponse(List<UserTimePreset> presets) {
        Map<Integer, List<UserTimePresetSlotResponse>> grouped = new LinkedHashMap<>();

        for (UserTimePreset preset : presets) {
            grouped.computeIfAbsent(preset.getTimesPerDay(), ignored -> new ArrayList<>())
                    .add(new UserTimePresetSlotResponse(
                            preset.getSortOrder(),
                            preset.getTakeTime()
                    ));
        }

        return grouped.entrySet().stream()
                .map(entry -> new UserTimePresetGroupResponse(entry.getKey(), entry.getValue()))
                .toList();
    }
}
