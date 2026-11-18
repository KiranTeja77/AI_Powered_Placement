package com.placewise.api.common;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("app")
public record AppProperties(
        @DefaultValue("http://localhost:5173") String webOrigin,
        Jwt jwt,
        @DefaultValue Auth auth,
        @DefaultValue Cookie cookie,
        @DefaultValue Mail mail,
        @DefaultValue Admin admin,
        @DefaultValue Ai ai) {

    public record Jwt(String secret, @DefaultValue("15m") Duration accessTtl) {}

    public record Auth(
            @DefaultValue("7d") Duration refreshTtl,
            @DefaultValue("30m") Duration resetTtl,
            @DefaultValue("12") int bcryptStrength,
            @DefaultValue("5") int maxFailedLogins,
            @DefaultValue("15m") Duration loginWindow,
            /**
             * How long after a refresh token was rotated it may be presented once more without
             * ending the session. Covers two tabs of one browser refreshing at the same moment.
             * Zero turns it off, so any reuse ends the session.
             */
            @DefaultValue("10s") Duration refreshGrace,
            /** How long the set-password link emailed to a new staff account works. */
            @DefaultValue("24h") Duration inviteTtl) {}

    public record Cookie(@DefaultValue("true") boolean secure) {}

    public record Mail(@DefaultValue("no-reply@placewise.local") String from) {}

    public record Admin(String email, String password) {}

    /** The internal resume-analysis service. */
    public record Ai(
            @DefaultValue("http://localhost:8000") String baseUrl,
            @DefaultValue("10s") Duration timeout) {}
}
