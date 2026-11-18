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
 * whole family (the session), since it means the token was copied, except for a short grace window
 * after a rotation (see {@link #rotate}).
 */
@Service
public class RefreshTokenService {

    /** A freshly issued raw token and the user it belongs to. */
    public record Issued(String rawToken, AppUser user) {}

    private final RefreshTokenRepository tokens;
    private final AppUserRepository users;
    private final Clock clock;
    private final Duration ttl;
    private final Duration grace;

    RefreshTokenService(RefreshTokenRepository tokens, AppUserRepository users, Clock clock,
            AppProperties props) {
        this.tokens = tokens;
        this.users = users;
        this.clock = clock;
        this.ttl = props.auth().refreshTtl();
        this.grace = props.auth().refreshGrace();
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
     *
     * <p>A token that was rotated out less than the grace window ago may be presented once more.
     * That is what two tabs of one browser do when they refresh together, so it is not treated as
     * theft: the caller gets another live token in the same session. Only digests are stored, so
     * the successor already issued cannot be handed out again; a second successor is issued next to
     * it, and each tab carries on with its own. Any reuse after the window, or of a token that
     * logout or a revocation killed, ends the whole session.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Issued rotate(String rawToken) {
        Instant now = clock.instant();
        String hash = TokenCodec.hash(rawToken);
        RefreshToken current = tokens.findByTokenHash(hash)
                .orElseThrow(() -> ApiException.unauthorized("Your session has expired. Sign in again."));

        if (current.getRevokedAt() != null) {
            return reuse(current, now);
        }
        if (!current.getExpiresAt().isAfter(now)) {
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        // Atomic compare-and-set: of two concurrent requests with the same token only one rotates.
        if (tokens.rotateIfActive(current.getId(), now) == 0) {
            // The loser of that race sees the winner's rotation, so it falls under the grace rule.
            return reuse(tokens.findByTokenHash(hash).orElse(current), now);
        }
        AppUser user = users.findById(current.getUserId()).orElse(null);
        if (user == null || !user.isActive()) {
            tokens.revokeFamily(current.getFamilyId(), now);
            throw ApiException.unauthorized("Your session has expired. Sign in again.");
        }
        return new Issued(issue(user.getId(), current.getFamilyId()), user);
    }

    /** A token that is already revoked was presented: forgive a very recent rotation, else end the session. */
    private Issued reuse(RefreshToken revoked, Instant now) {
        boolean recentlyRotated = revoked.getRotatedAt() != null
                && !grace.isZero()
                && Duration.between(revoked.getRotatedAt(), now).compareTo(grace) < 0;
        if (recentlyRotated && tokens.existsByFamilyIdAndRevokedAtIsNull(revoked.getFamilyId())
                && revoked.getExpiresAt().isAfter(now)) {
            AppUser user = users.findById(revoked.getUserId()).orElse(null);
            if (user != null && user.isActive()) {
                return new Issued(issue(user.getId(), revoked.getFamilyId()), user);
            }
        }
        tokens.revokeFamily(revoked.getFamilyId(), now);
        throw ApiException.unauthorized("Your session has expired. Sign in again.");
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
