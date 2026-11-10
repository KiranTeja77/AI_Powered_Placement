package com.placewise.api.auth;

import com.placewise.api.common.ApiException;
import com.placewise.api.common.AppProperties;
import com.placewise.api.user.AppUser;
import com.placewise.api.user.AppUserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Opaque refresh tokens with rotation. Only SHA-256 digests are stored. Every refresh revokes the
 * presented token and issues a new one in the same family; presenting a revoked token revokes the
 * whole family (the session), since it means the token was copied.
 */
@Service
public class RefreshTokenService {

    /** A freshly issued raw token and the user it belongs to. */
    public record Issued(String rawToken, AppUser user) {}

    private final RefreshTokenRepository tokens;
    private final AppUserRepository users;
    private final Clock clock;
    private final Duration ttl;

    RefreshTokenService(RefreshTokenRepository tokens, AppUserRepository users, Clock clock,
            AppProperties props) {
        this.tokens = tokens;
        this.users = users;
        this.clock = clock;
        this.ttl = props.auth().refreshTtl();
    }

    public Duration ttl() {
        return ttl;
    }

    /** Starts a new session (new family). */
    @Transactional
    public String startSession(UUID userId) {
        return issue(userId, UUID.randomUUID());
    }

    /**
     * Rotates a refresh token. Revocations made before throwing must be kept, hence noRollbackFor.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Issued rotate(String rawToken) {
        Instant now = clock.instant();
        RefreshToken current = tokens.findByTokenHash(TokenCodec.hash(rawToken))
                .orElseThrow(() -> ApiException.unauthorized("Your session has expired. Sign in again."));

        if (current.getRevokedAt() != null) {
            tokens.revokeFamily(current.getFamilyId(), now);
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        if (!current.getExpiresAt().isAfter(now)) {
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        // Atomic compare-and-set: of two concurrent requests with the same token only one wins.
        if (tokens.revokeIfActive(current.getId(), now) == 0) {
            tokens.revokeFamily(current.getFamilyId(), now);
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        AppUser user = users.findById(current.getUserId()).orElse(null);
        if (user == null || !user.isActive()) {
            tokens.revokeFamily(current.getFamilyId(), now);
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        return new Issued(issue(user.getId(), current.getFamilyId()), user);
    }

    /** Ends the session the token belongs to. Unknown tokens are ignored. */
    @Transactional
    public void revokeSession(String rawToken) {
        tokens.findByTokenHash(TokenCodec.hash(rawToken))
                .ifPresent(t -> tokens.revokeFamily(t.getFamilyId(), clock.instant()));
    }

    @Transactional
    public void revokeAllForUser(UUID userId) {
        tokens.revokeAllForUser(userId, clock.instant());
    }

    private String issue(UUID userId, UUID familyId) {
        Instant now = clock.instant();
        String raw = TokenCodec.newToken();
        tokens.save(new RefreshToken(userId, familyId, TokenCodec.hash(raw), now.plus(ttl), now));
        return raw;
    }
}
