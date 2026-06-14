package com.ibmteam02.backend_auth.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

public class PasswordRequest {

    @Getter
    @NoArgsConstructor
    public static class FindRequest {
        private String email;
        private String phoneNumber;
    }

    @Getter
    @NoArgsConstructor
    public static class ResetRequest {
        private String email;
        private String phoneNumber;
        private String code;
        private String newPassword;
    }

    @Getter
    @NoArgsConstructor
    public static class UpdateRequest {
        private String oldPassword;
        private String newPassword;
    }
}
