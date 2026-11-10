package com.placewise.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "login_attempt")
public class LoginAttempt {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String identifier;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "attempted_at")
    private Instant attemptedAt;

    protected LoginAttempt() {}

    public LoginAttempt(String identifier, String ipAddress, Instant attemptedAt) {
        this.identifier = identifier;
        this.ipAddress = ipAddress;
        this.attemptedAt = attemptedAt;
    }

    public Instant getAttemptedAt() {
        return attemptedAt;
    }
}
