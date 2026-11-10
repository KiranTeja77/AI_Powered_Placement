package com.placewise.api.auth;

import com.placewise.api.common.ApiException;
import com.placewise.api.common.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Limits failed sign-ins to N per window for each account and IP pair. Attempts are stored in the
 * database so the limit survives restarts and holds across several API instances.
 */
@Service
class LoginRateLimiter {

    private final LoginAttemptRepository attempts;
    private final Clock clock;
    private final int maxFailures;
    private final Duration window;

    LoginRateLimiter(LoginAttemptRepository attempts, Clock clock, AppProperties props) {
        this.attempts = attempts;
        this.clock = clock;
        this.maxFailures = props.auth().maxFailedLogins();
        this.window = props.auth().loginWindow();
    }

    /** Throws 429 with Retry-After when the pair has used up its attempts. */
    @Transactional(readOnly = true, noRollbackFor = ApiException.class)
    public void assertNotLimited(String identifier, String ip) {
        Instant now = clock.instant();
        List<LoginAttempt> recent = attempts.findRecent(identifier, ip, now.minus(window));
        if (recent.size() >= maxFailures) {
            // The block lifts when the oldest counted failure leaves the window.
            Instant unblockAt = recent.get(recent.size() - maxFailures).getAttemptedAt().plus(window);
            long retryAfter = Math.max(1, Duration.between(now, unblockAt).toSeconds());
            throw ApiException.tooManyRequests(
                    "Too many failed sign-in attempts. Try again later.", retryAfter);
        }
    }

    @Transactional
    public void recordFailure(String identifier, String ip) {
        attempts.save(new LoginAttempt(identifier, ip, clock.instant()));
    }

    @Transactional
    public void clear(String identifier, String ip) {
        attempts.clear(identifier, ip);
    }
}
