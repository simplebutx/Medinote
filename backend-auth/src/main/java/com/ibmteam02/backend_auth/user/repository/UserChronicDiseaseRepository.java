package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.UserChronicDisease;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserChronicDiseaseRepository extends JpaRepository<UserChronicDisease,Long> {
}
