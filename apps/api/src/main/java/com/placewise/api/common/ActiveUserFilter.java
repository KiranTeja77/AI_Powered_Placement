package com.placewise.api.common;

import com.placewise.api.user.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Access tokens are stateless and live for 15 minutes, so on their own they would keep working
 * for that long after an admin deactivates an account. This checks the account on every request
 * (one lookup by primary key), so deactivation takes effect straight away. A deactivated or deleted
 * account gets 401, and since its refresh tokens are revoked it cannot get a new access token.
 */
class ActiveUserFilter extends OncePerRequestFilter {

    private final AppUserRepository users;
    private final ProblemSecurityHandlers problems;

    ActiveUserFilter(AppUserRepository users, ProblemSecurityHandlers problems) {
        this.users = users;
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken token) {
            boolean active = users.findById(UUID.fromString(token.getToken().getSubject()))
                    .map(u -> u.isActive()).orElse(false);
            if (!active) {
                SecurityContextHolder.clearContext();
                problems.commence(request, response, new BadCredentialsException("Account is not active"));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
