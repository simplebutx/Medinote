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
    boolean existsByEmailHash(String emailHash);
    //로그인
    Optional<User> findByEmailHash(String emailHash);

    // 기존 가입자(평문 데이터)를 위한 네이티브 쿼리
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM users WHERE email = :email", nativeQuery = true)
    Optional<User> findByRawEmail(@org.springframework.data.repository.query.Param("email") String email);

    //약사 승인 대기중인 리스트
    List<User> findByStatus(UserStatus status);
}
