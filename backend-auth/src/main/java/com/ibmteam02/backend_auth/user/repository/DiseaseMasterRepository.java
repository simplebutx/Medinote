package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.DiseaseMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiseaseMasterRepository extends JpaRepository<DiseaseMaster,String> {
    Optional<DiseaseMaster> findByDiseaseName(String diseaseName);
    List<DiseaseMaster> findTop10ByDiseaseNameContaining(String keyword);
}
