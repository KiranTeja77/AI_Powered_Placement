package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.placewise.api.common.AppProperties;
import com.placewise.api.user.AppUser;
import com.placewise.api.user.Role;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class AccessTokenServiceTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-0123456789";
    private static final Instant NOW = Instant.parse("2026-01-01T10:00:00Z");

    private static SecretKeySpec key(String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static AccessTokenService service(Clock clock) {
        AppProperties props = new AppProperties("http://localhost", new AppProperties.Jwt(SECRET, Duration.ofMinutes(15)),
                new AppProperties.Auth(Duration.ofDays(7), Duration.ofMinutes(30), 4, 5, Duration.ofMinutes(15)),
                new AppProperties.Cookie(true), new AppProperties.Mail("a@b.c"), new AppProperties.Admin(null, null));
        return new AccessTokenService(new NimbusJwtEncoder(new ImmutableSecret<>(key(SECRET))), clock, props);
    }

    private static AppUser user(Role role) {
        AppUser u = new AppUser("a@b.c", "hash", "Name", role, null, NOW);
        ReflectionTestUtils.setField(u, "id", UUID.fromString("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b"));
        return u;
    }

    private static NimbusJwtDecoder decoder(String secret) {
        return NimbusJwtDecoder.withSecretKey(key(secret)).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Test
    void issuesAFifteenMinuteTokenCarryingSubjectAndRole() {
        Clock clock = Clock.fixed(Instant.now(), ZoneOffset.UTC);
        String token = service(clock).issue(user(Role.FACULTY));

        Jwt jwt = decoder(SECRET).decode(token);
        assertThat(jwt.getSubject()).isEqualTo("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b");
        assertThat(jwt.<String>getClaim("role")).isEqualTo("FACULTY");
        assertThat(jwt.getIssuer()).hasToString(AccessTokenService.ISSUER);
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void reportsExpiryInSeconds() {
        assertThat(service(Clock.fixed(NOW, ZoneOffset.UTC)).expiresInSeconds()).isEqualTo(900);
    }

    @Test
    void rejectsAnExpiredToken() {
        // Issued two hours ago, so it expired well before now.
        String token = service(Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC))
                .issue(user(Role.STUDENT));
        assertThatThrownBy(() -> decoder(SECRET).decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        String token = service(Clock.systemUTC()).issue(user(Role.ADMIN));
        assertThatThrownBy(() -> decoder("another-secret-another-secret-0123456789").decode(token))
                .isInstanceOf(BadJwtException.class);
    }

    @Test
    void rejectsATamperedPayload() {
        String token = service(Clock.systemUTC()).issue(user(Role.STUDENT));
        String[] parts = token.split("\\.");
        String forged = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"x\",\"role\":\"ADMIN\",\"iss\":\"https://placewise.local\",\"exp\":9999999999}"
                        .getBytes(StandardCharsets.UTF_8));
        assertThatThrownBy(() -> decoder(SECRET).decode(parts[0] + "." + forged + "." + parts[2]))
                .isInstanceOf(BadJwtException.class);
    }
}
