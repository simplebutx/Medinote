package com.ibmteam02.backend_medication.schedule.repository;

import com.ibmteam02.backend_medication.schedule.domain.UserTimePreset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTimePresetRepository extends JpaRepository<UserTimePreset, Long> {

    List<UserTimePreset> findByUserIdOrderByTimesPerDayAscSortOrderAsc(Long userId);

    void deleteByUserId(Long userId);
}
