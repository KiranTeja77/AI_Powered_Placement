package com.placewise.api.user;

import com.placewise.api.auth.AuthDtos;
import com.placewise.api.auth.RefreshTokenService;
import com.placewise.api.common.ApiException;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MeService {

    private final AppUserRepository users;
    private final UserMapper mapper;
    private final PasswordEncoder encoder;
    private final RefreshTokenService refreshTokens;
    private final Clock clock;

    MeService(AppUserRepository users, UserMapper mapper, PasswordEncoder encoder,
            RefreshTokenService refreshTokens, Clock clock) {
        this.users = users;
        this.mapper = mapper;
        this.encoder = encoder;
        this.refreshTokens = refreshTokens;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public UserResponse current(UUID userId) {
        return mapper.toResponse(load(userId));
    }

    @Transactional
    public void changePassword(UUID userId, AuthDtos.ChangePasswordRequest req) {
        AppUser user = load(userId);
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.invalid("Some fields are not valid.",
                    Map.of("currentPassword", "Current password is incorrect"));
        }
        if (encoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw ApiException.invalid("Some fields are not valid.",
                    Map.of("newPassword", "Choose a password you have not used here before"));
        }
        user.changePassword(encoder.encode(req.newPassword()), clock.instant());
        users.save(user);
        refreshTokens.revokeAllForUser(userId);
    }

    private AppUser load(UUID userId) {
        return users.findById(userId)
                .filter(AppUser::isActive)
                .orElseThrow(() -> ApiException.unauthorized("Sign in to continue."));
    }
}
