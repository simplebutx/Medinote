package com.ibmteam02.backend_auth.user.repository;

import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {
    //회원가입
    boolean existsByEmail(String email);
    //로그인
    Optional<User> findByEmail(String email);
    //약사 승인 대기중인 리스트
    List<User> findByStatus(UserStatus status);
}
