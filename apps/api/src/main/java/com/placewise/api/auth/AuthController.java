package com.placewise.api.auth;

import com.placewise.api.common.AppProperties;
import com.placewise.api.user.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.placewise.api.common.ApiException;
import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    static final String REFRESH_COOKIE = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AuthService auth;
    private final PasswordResetService passwordReset;
    private final AppProperties props;
    private final RefreshTokenService refreshTokens;

    AuthController(AuthService auth, PasswordResetService passwordReset, AppProperties props,
            RefreshTokenService refreshTokens) {
        this.auth = auth;
        this.passwordReset = passwordReset;
        this.props = props;
        this.refreshTokens = refreshTokens;
    }

    @PostMapping("/register")
    ResponseEntity<UserResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(request));
    }

    @PostMapping("/login")
    ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest http) {
        AuthService.Session session = auth.login(request, http.getRemoteAddr());
        return withRefreshCookie(session);
    }

    @PostMapping("/refresh")
    ResponseEntity<AuthDtos.AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        try {
            return withRefreshCookie(auth.refresh(refreshToken));
        } catch (ApiException e) {
            // A rejected token is useless; clear it so the browser stops sending it.
            response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
            throw e;
        }
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    /** Always 202, whether or not the email belongs to an account. */
    @PostMapping("/forgot-password")
    ResponseEntity<Void> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        passwordReset.requestReset(request.email());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    ResponseEntity<Void> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        passwordReset.reset(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<AuthDtos.AuthResponse> withRefreshCookie(AuthService.Session session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(session.refreshToken(), refreshTokens.ttl()).toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(session.body());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.cookie().secure())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
