package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class RefreshAndLogoutIntegrationTest extends IntegrationTestBase {

    private Cookie first;

    @BeforeEach
    void signIn() throws Exception {
        register("session@college.edu", "21CS201");
        first = refreshCookie(mvc.perform(login("session@college.edu", PASSWORD, "10.6.0.1")).andReturn());
    }

    private MvcResult refresh(Cookie cookie) throws Exception {
        return mvc.perform(cookie == null ? post("/api/v1/auth/refresh") : post("/api/v1/auth/refresh").cookie(cookie))
                .andReturn();
    }

    private int active() {
        return jdbc.queryForObject("select count(*) from refresh_token where revoked_at is null", Integer.class);
    }

    @Test
    void rotatesTheRefreshTokenOnEveryUse() throws Exception {
        MvcResult second = refresh(first);
        assertThat(second.getResponse().getStatus()).isEqualTo(200);
        assertThat(read(second, "$.accessToken")).isNotBlank();
        assertThat(read(second, "$.user.email")).isEqualTo("session@college.edu");

        Cookie rotated = refreshCookie(second);
        assertThat(rotated.getValue()).isNotEqualTo(first.getValue());
        assertThat(second.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("HttpOnly", "SameSite=Strict");

        // The old token is revoked, the new one active, and both belong to one family.
        assertThat(active()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(distinct family_id) from refresh_token", Integer.class)).isEqualTo(1);
        assertThat(refresh(rotated).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void reusingARevokedTokenRevokesTheWholeFamily() throws Exception {
        Cookie second = refreshCookie(refresh(first));
        Cookie third = refreshCookie(refresh(second));
        assertThat(active()).isEqualTo(1);

        // `first` was already rotated out; presenting it again means it was copied.
        MvcResult replay = refresh(first);
        assertThat(replay.getResponse().getStatus()).isEqualTo(401);
        assertThat(replay.getResponse().getContentType()).contains("application/problem+json");
        assertThat(replay.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");

        assertThat(active()).isZero();
        assertThat(refresh(third).getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void reuseOnlyAffectsTheSessionItBelongsTo() throws Exception {
        Cookie otherDevice = refreshCookie(mvc.perform(login("session@college.edu", PASSWORD, "10.6.0.2")).andReturn());
        refresh(first);
        refresh(first); // replay kills the first session only
        assertThat(refresh(otherDevice).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void rejectsAMissingOrUnknownToken() throws Exception {
        mvcStatus(refresh(null), 401);
        mvcStatus(refresh(new Cookie("refresh_token", "not-a-real-token")), 401);
        assertThat(active()).isEqualTo(1);
    }

    @Test
    void rejectsAnExpiredToken() throws Exception {
        jdbc.update("update refresh_token set expires_at = now() - interval '1 minute'");
        mvcStatus(refresh(first), 401);
    }

    @Test
    void stopsRefreshingForDeactivatedAccounts() throws Exception {
        jdbc.update("update app_user set status = 'INACTIVE'");
        mvcStatus(refresh(first), 401);
        assertThat(active()).isZero();
    }

    @Test
    void concurrentUseOfOneTokenSucceedsAtMostOnce() throws Exception {
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var tasks = java.util.List.<java.util.concurrent.Callable<Integer>>of(
                    () -> refresh(first).getResponse().getStatus(),
                    () -> refresh(first).getResponse().getStatus());
            int ok = 0;
            for (var f : pool.invokeAll(tasks)) {
                if (f.get() == 200) {
                    ok++;
                }
            }
            assertThat(ok).isLessThanOrEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void logoutRevokesTheSessionAndClearsTheCookie() throws Exception {
        Cookie second = refreshCookie(refresh(first));
        MvcResult result = mvc.perform(post("/api/v1/auth/logout").cookie(second))
                .andExpect(status().isNoContent())
                .andReturn();
        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("refresh_token=", "Max-Age=0");
        assertThat(active()).isZero();
        mvcStatus(refresh(second), 401);
    }

    @Test
    void logoutWithoutACookieStillSucceeds() throws Exception {
        mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie("refresh_token", UUID.randomUUID().toString())))
                .andExpect(status().isNoContent());
    }

    @Test
    void refreshErrorsArriveAsProblemJson() throws Exception {
        mvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    private static void mvcStatus(MvcResult result, int expected) {
        assertThat(result.getResponse().getStatus()).isEqualTo(expected);
    }
}
