package com.ibmteam02.backend_auth.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.ibmteam02.backend_auth.user.domain.Gender;
import com.ibmteam02.backend_auth.user.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {
    private String email;
    private String password;
    private String username;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    private Gender gender; //MALE or FEMALE
    private Role role; // USER or PHARMACIST
}
