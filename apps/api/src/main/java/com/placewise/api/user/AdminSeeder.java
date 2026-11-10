package com.placewise.api.user;

import com.placewise.api.common.AppProperties;
import java.time.Clock;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first admin from ADMIN_EMAIL and ADMIN_PASSWORD when both are set and no account with
 * that email exists. Nothing is hard-coded and an existing account is never modified.
 */
@Component
class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AppProperties props;
    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final Clock clock;

    AdminSeeder(AppProperties props, AppUserRepository users, PasswordEncoder encoder, Clock clock) {
        this.props = props;
        this.users = users;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = props.admin().email();
        String password = props.admin().password();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(normalized)) {
            return;
        }
        users.save(new AppUser(normalized, encoder.encode(password), "Administrator", Role.ADMIN, null,
                clock.instant()));
        log.info("Created the initial admin account");
    }
}
