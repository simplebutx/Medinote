package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserChronicDisease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserChronicDiseaseRepository extends JpaRepository<UserChronicDisease,Long> {
    Optional<UserChronicDisease> findByUser(User user);
}
