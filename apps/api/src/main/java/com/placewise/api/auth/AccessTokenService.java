package com.placewise.api.auth;

import com.placewise.api.common.AppProperties;
import com.placewise.api.user.AppUser;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues short-lived signed access tokens (JWT, HS256). */
@Service
public class AccessTokenService {

    public static final String ISSUER = "https://placewise.local";

    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration ttl;

    AccessTokenService(JwtEncoder encoder, Clock clock, AppProperties props) {
        this.encoder = encoder;
        this.clock = clock;
        this.ttl = props.jwt().accessTtl();
    }

    public String issue(AppUser user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("role", user.getRole().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long expiresInSeconds() {
        return ttl.toSeconds();
    }
}
