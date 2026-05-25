package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.PharmacistProfile;
import com.ibmteam02.backend_auth.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PharmacistProfileRepository extends JpaRepository<PharmacistProfile,Long> {
    Optional<PharmacistProfile> findByUser(User user);
}
