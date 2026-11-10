package com.placewise.api.user;

import com.placewise.api.auth.AuthDtos;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final MeService me;

    MeController(MeService me) {
        this.me = me;
    }

    @GetMapping
    UserResponse current(@AuthenticationPrincipal Jwt jwt) {
        return me.current(UUID.fromString(jwt.getSubject()));
    }

    /** Ends every session on success, so the client signs in again with the new password. */
    @PostMapping("/password")
    ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        me.changePassword(UUID.fromString(jwt.getSubject()), request);
        return ResponseEntity.noContent().build();
    }
}
