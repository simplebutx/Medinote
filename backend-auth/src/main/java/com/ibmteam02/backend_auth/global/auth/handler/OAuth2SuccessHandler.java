package com.ibmteam02.backend_auth.global.auth.handler;

import com.ibmteam02.backend_auth.global.auth.domain.CustomUserDetails;
import com.ibmteam02.backend_auth.global.auth.jwt.JwtProvider;
import com.ibmteam02.backend_auth.user.domain.User;
import com.ibmteam02.backend_auth.user.domain.UserStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtProvider jwtProvider;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String accessToken = jwtProvider.createToken(user.getId(), user.getEmail(), user.getRole().name());

        String targetUrl;

        if (user.getStatus() == UserStatus.PENDING) {
            targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/signup/extra-info")
                    .queryParam("token", accessToken)
                    .queryParam("email", user.getEmail())
                    .build().toUriString();
        } else {
            targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/oauth2/redirect")
                    .queryParam("token", accessToken)
                    .build().toUriString();
        }

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
