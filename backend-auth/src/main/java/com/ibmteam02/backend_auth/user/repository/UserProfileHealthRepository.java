package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.UserProfileHealth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProfileHealthRepository extends JpaRepository<UserProfileHealth, Long> {
}
