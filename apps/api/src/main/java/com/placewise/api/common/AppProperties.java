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
        @DefaultValue Admin admin) {

    public record Jwt(String secret, @DefaultValue("15m") Duration accessTtl) {}

    public record Auth(
            @DefaultValue("7d") Duration refreshTtl,
            @DefaultValue("30m") Duration resetTtl,
            @DefaultValue("12") int bcryptStrength,
            @DefaultValue("5") int maxFailedLogins,
            @DefaultValue("15m") Duration loginWindow) {}

    public record Cookie(@DefaultValue("true") boolean secure) {}

    public record Mail(@DefaultValue("no-reply@placewise.local") String from) {}

    public record Admin(String email, String password) {}
}
