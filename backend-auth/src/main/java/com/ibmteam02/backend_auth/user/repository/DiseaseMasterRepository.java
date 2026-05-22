package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.DiseaseMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DiseaseMasterRepository extends JpaRepository<DiseaseMaster,String> {
    Optional<DiseaseMaster> findByDiseaseName(String diseaseName);
    List<DiseaseMaster> findTop10ByDiseaseNameContaining(String keyword);
}
