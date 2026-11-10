package com.placewise.api.auth;

import com.placewise.api.common.ApiException;
import com.placewise.api.common.AppProperties;
import com.placewise.api.user.AppUser;
import com.placewise.api.user.AppUserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final AppUserRepository users;
    private final PasswordResetTokenRepository resetTokens;
    private final RefreshTokenService refreshTokens;
    private final AuthMailer mailer;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final Duration ttl;
    private final String webOrigin;

    PasswordResetService(AppUserRepository users, PasswordResetTokenRepository resetTokens,
            RefreshTokenService refreshTokens, AuthMailer mailer, PasswordEncoder encoder, Clock clock,
            AppProperties props) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.refreshTokens = refreshTokens;
        this.mailer = mailer;
        this.encoder = encoder;
        this.clock = clock;
        this.ttl = props.auth().resetTtl();
        this.webOrigin = props.webOrigin();
    }

    /**
     * Sends a reset link if the account exists and is active. Never reveals whether it does: the
     * caller always answers 202, and mail failures are logged without the token.
     */
    @Transactional
    public void requestReset(String email) {
        AppUser user = users.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        if (user == null || !user.isActive()) {
            return;
        }
        Instant now = clock.instant();
        resetTokens.invalidateAllForUser(user.getId(), now);
        String raw = TokenCodec.newToken();
        resetTokens.save(new PasswordResetToken(user.getId(), TokenCodec.hash(raw), now.plus(ttl), now));
        try {
            mailer.sendPasswordReset(user.getEmail(), user.getFullName(),
                    webOrigin + "/reset-password?token=" + raw);
        } catch (RuntimeException e) {
            log.warn("Password reset email could not be sent ({})", e.getClass().getSimpleName());
        }
    }

    /** Sets a new password with a single-use token, and ends all of the user's sessions. */
    @Transactional
    public void reset(String rawToken, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = resetTokens.findByTokenHash(TokenCodec.hash(rawToken))
                .orElseThrow(PasswordResetService::invalidToken);
        if (resetTokens.consumeIfValid(token.getId(), now) == 0) {
            throw invalidToken();
        }
        AppUser user = users.findById(token.getUserId()).orElseThrow(PasswordResetService::invalidToken);
        user.changePassword(encoder.encode(newPassword), now);
        users.save(user);
        resetTokens.invalidateAllForUser(user.getId(), now);
        refreshTokens.revokeAllForUser(user.getId());
    }

    private static ApiException invalidToken() {
        return ApiException.badRequest("invalid_token", "This reset link is invalid or has expired.");
    }
}
