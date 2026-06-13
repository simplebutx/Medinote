package com.ibmteam02.backend_medication.smartpill.repository;

import com.ibmteam02.backend_medication.smartpill.domain.SmartPillDevice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SmartPillDeviceRepository extends JpaRepository<SmartPillDevice, Long> {
    Optional<SmartPillDevice> findByDeviceId(String deviceId);

    Optional<SmartPillDevice> findByDeviceIdAndUserId(String deviceId, Long userId);

    List<SmartPillDevice> findByUserIdOrderByCreatedAtDesc(Long userId);
}
