package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserChronicDisease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserChronicDiseaseRepository extends JpaRepository<UserChronicDisease,Long> {
    List<UserChronicDisease> findByUser(User user);
    void deleteByUser(User user);
}
