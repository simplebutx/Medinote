package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.UserChronicDisease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserChronicDiseaseRepository extends JpaRepository<UserChronicDisease,Long> {
    List<UserChronicDisease> findByUserId();
    void deleteByUserIdAndDiseaseMasterDiseaseCode(Long userId, String diseaseCode);
}
