package com.ibmteam02.backend_medication.smartpill.dto;

import java.util.List;

public record SmartPillSlotAssignmentSaveRequest(
        String name,
        List<SmartPillSlotSaveRequest> slots
) {
}
