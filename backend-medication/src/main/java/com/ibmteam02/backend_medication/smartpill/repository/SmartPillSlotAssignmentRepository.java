package com.ibmteam02.backend_medication.smartpill.repository;

import com.ibmteam02.backend_medication.smartpill.domain.SmartPillSlotAssignment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SmartPillSlotAssignmentRepository extends JpaRepository<SmartPillSlotAssignment, Long> {
    List<SmartPillSlotAssignment> findByDeviceDeviceIdOrderBySlotNumberAscIdAsc(String deviceId);

    List<SmartPillSlotAssignment> findByDeviceDeviceIdAndSlotNumberOrderByIdAsc(String deviceId, Integer slotNumber);

    void deleteByDevice_Id(Long deviceId);
}
