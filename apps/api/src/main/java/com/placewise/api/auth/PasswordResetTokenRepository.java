package com.placewise.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Single-use: succeeds (returns 1) only for an unused, unexpired token. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetToken t set t.usedAt = :now "
            + "where t.id = :id and t.usedAt is null and t.expiresAt > :now")
    int consumeIfValid(@Param("id") UUID id, @Param("now") Instant now);

    /** Invalidates every other outstanding token for the user. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetToken t set t.usedAt = :now where t.userId = :userId and t.usedAt is null")
    int invalidateAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
