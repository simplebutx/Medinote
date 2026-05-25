package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {
    //회원가입
    boolean existsByEmail(String email);
    //로그인
    Optional<User> findByEmail(String email);
}
