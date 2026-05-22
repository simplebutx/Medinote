package com.ibmteam02.backend_auth.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PharmacistVerifyRequest {

    private String email;
    private String docNumber;
    private String licenseNumber;
}
