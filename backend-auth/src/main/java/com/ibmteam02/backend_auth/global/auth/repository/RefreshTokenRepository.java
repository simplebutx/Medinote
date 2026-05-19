package com.mymedi.backend.global.auth.repository;

import com.mymedi.backend.global.auth.domain.RefreshToken;
import org.springframework.data.repository.CrudRepository;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, String> {

}
