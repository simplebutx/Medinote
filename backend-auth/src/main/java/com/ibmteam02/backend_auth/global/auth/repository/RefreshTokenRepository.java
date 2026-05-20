package com.ibmteam02.backend_auth.global.auth.repository;

import com.ibmteam02.backend_auth.global.auth.domain.RefreshToken;
import org.springframework.data.repository.CrudRepository;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, String> {

}
