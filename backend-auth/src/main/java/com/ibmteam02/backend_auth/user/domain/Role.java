package com.mymedi.backend.user.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@AllArgsConstructor
public enum Role {
    USER("ROLE_USER"),
    PHARMACIST("ROLE_PHARMACIST"),
    ADMIN("ROLE_ADMIN");

    private final String key;
}
