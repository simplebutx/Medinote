package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.UserProfileHealth;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileHealthRepository extends JpaRepository<UserProfileHealth,Long> {
    Optional<UserProfileHealth> findByUserId(Long userId);
}
