package com.placewise.api.common;

import com.placewise.api.user.Role;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpMethod;

/**
 * Who may call what. This one list is used twice: {@link SecurityConfig} turns it into the
 * authorization rules that really run, and the admin permissions endpoint turns it into the matrix
 * shown on the roles screen. Because both read the same list, the screen cannot describe a rule
 * that is not enforced, and a rule cannot be added without it appearing there.
 *
 * <p>The first rule that matches a request wins, so more specific rules come first.
 */
public final class AccessRules {

    private AccessRules() {}

    /** Who a rule lets through. */
    public enum Access {
        /** Anyone, signed in or not. */
        PUBLIC,
        /** Any signed-in account, whatever its role. */
        SIGNED_IN,
        /** Only the listed roles. */
        ROLES
    }

    /**
     * One rule. {@code method} is null for every method. {@code sample} is a GET path that the
     * enforcement test calls once per role to prove the rule really behaves as described.
     */
    public record Rule(
            String id,
            String group,
            String label,
            HttpMethod method,
            List<String> patterns,
            Access access,
            Set<Role> roles,
            String sample) {

        public boolean allows(Role role) {
            return access != Access.ROLES || roles.contains(role);
        }
    }

    private static Rule publicRule(String id, String group, String label, HttpMethod method, String sample,
            String... patterns) {
        return new Rule(id, group, label, method, List.of(patterns), Access.PUBLIC, Set.of(), sample);
    }

    private static Rule forRoles(String id, String group, String label, String sample, Set<Role> roles,
            String... patterns) {
        return new Rule(id, group, label, null, List.of(patterns), Access.ROLES, roles, sample);
    }

    private static Rule signedIn(String id, String group, String label, String sample, String... patterns) {
        return new Rule(id, group, label, null, List.of(patterns), Access.SIGNED_IN, Set.of(), sample);
    }

    /** In the order they are applied. Anything not listed needs a signed-in account (see below). */
    public static final List<Rule> RULES = List.of(
            publicRule("health", "Public", "See that the service is running", null, "/api/v1/health",
                    "/api/v1/health"),
            publicRule("departments", "Public", "List the departments", null, "/api/v1/departments",
                    "/api/v1/departments"),
            publicRule("auth", "Public", "Register, sign in, refresh a session, sign out and reset a password",
                    HttpMethod.POST, null, "/api/v1/auth/register", "/api/v1/auth/login",
                    "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/forgot-password",
                    "/api/v1/auth/reset-password"),
            publicRule("api-docs", "Public", "Read the API documentation", null, "/v3/api-docs",
                    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"),

            forRoles("admin", "Administration", "Manage accounts and see platform information",
                    "/api/v1/admin/users", Set.of(Role.ADMIN), "/api/v1/admin/**"),

            // Analyses belong to the student who made them. Faculty access comes later.
            forRoles("resumes", "Preparation", "Analyze a resume and manage your analyses",
                    "/api/v1/resumes/analyses", Set.of(Role.STUDENT), "/api/v1/resumes/**"),
            forRoles("career-interests", "Preparation", "Save your career interests",
                    "/api/v1/me/career-interests", Set.of(Role.STUDENT), "/api/v1/me/career-interests"),

            signedIn("account", "Any signed-in account", "See your own account and change your password",
                    "/api/v1/me", "/api/v1/me", "/api/v1/me/password"),
            signedIn("catalogue", "Any signed-in account", "Read the role and skill catalogue",
                    "/api/v1/roles", "/api/v1/roles", "/api/v1/skills"));

    /** Every other path needs a signed-in account. It is not a permission anyone is granted. */
    public static final Access DEFAULT = Access.SIGNED_IN;
}
