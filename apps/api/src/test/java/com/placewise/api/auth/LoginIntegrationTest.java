package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class LoginIntegrationTest extends IntegrationTestBase {

    @Test
    void logsInWithEmailAndSetsAHardenedRefreshCookie() throws Exception {
        register("kiran@college.edu", "21CS101");

        MvcResult result = mvc.perform(login("Kiran@College.edu", PASSWORD, "10.0.0.1"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.role").value("STUDENT"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        assertThat(read(result, "$.accessToken")).isNotBlank();
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith("refresh_token=")
                .contains("HttpOnly").contains("Secure").contains("SameSite=Strict")
                .contains("Path=/api/v1/auth").contains("Max-Age=604800");
    }

    @Test
    void logsInWithRollNumberRegardlessOfCase() throws Exception {
        register("roll@college.edu", "21CS102");
        mvc.perform(login("21cs102", PASSWORD, "10.0.0.2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("roll@college.edu"));
    }

    @Test
    void storesOnlyAHashOfTheRefreshToken() throws Exception {
        register("hash@college.edu", "21CS103");
        MvcResult result = mvc.perform(login("hash@college.edu", PASSWORD, "10.0.0.3")).andReturn();
        String raw = refreshCookie(result).getValue();

        assertThat(raw).hasSize(43);
        assertThat(jdbc.queryForObject("select token_hash from refresh_token", String.class))
                .isEqualTo(TokenCodec.hash(raw)).isNotEqualTo(raw);
        assertThat(jdbc.queryForObject("select count(*) from refresh_token where token_hash = ?", Integer.class, raw))
                .isZero();
    }

    @Test
    void wrongPasswordAndUnknownAccountGiveTheSameProblem() throws Exception {
        register("same@college.edu", "21CS104");

        String wrongPassword = mvc.perform(login("same@college.edu", "Wr0ngPassword", "10.0.0.4"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(login("nobody@college.edu", "Wr0ngPassword", "10.0.0.4"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(wrongPassword).isEqualTo(unknown);
    }

    @Test
    void deactivatedAccountsCannotSignIn() throws Exception {
        insertUser("gone@college.edu", "FACULTY", "INACTIVE");
        mvc.perform(login("gone@college.edu", PASSWORD, "10.0.0.5"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("account_disabled"));
    }

    @Test
    void blocksTheSixthAttemptInAWindowEvenWithTheRightPassword() throws Exception {
        register("limit@college.edu", "21CS105");
        for (int i = 0; i < 5; i++) {
            mvc.perform(login("limit@college.edu", "Wr0ngPassword", "10.1.1.1"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(login("limit@college.edu", PASSWORD, "10.1.1.1"))
                .andExpect(status().isTooManyRequests())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("too_many_attempts"))
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));
    }

    @Test
    void theLimitAppliesPerAccountAndIpPair() throws Exception {
        register("pair@college.edu", "21CS106");
        register("other@college.edu", "21CS107");
        for (int i = 0; i < 5; i++) {
            mvc.perform(login("pair@college.edu", "Wr0ngPassword", "10.2.2.2"));
        }
        // Same account from another address, and another account from the same address, still work.
        mvc.perform(login("pair@college.edu", PASSWORD, "10.2.2.3")).andExpect(status().isOk());
        mvc.perform(login("other@college.edu", PASSWORD, "10.2.2.2")).andExpect(status().isOk());
        mvc.perform(login("pair@college.edu", PASSWORD, "10.2.2.2")).andExpect(status().isTooManyRequests());
    }

    @Test
    void failuresOlderThanTheWindowNoLongerCount() throws Exception {
        register("window@college.edu", "21CS108");
        for (int i = 0; i < 5; i++) {
            mvc.perform(login("window@college.edu", "Wr0ngPassword", "10.3.3.3"));
        }
        jdbc.update("update login_attempt set attempted_at = now() - interval '16 minutes'");
        mvc.perform(login("window@college.edu", PASSWORD, "10.3.3.3")).andExpect(status().isOk());
    }

    @Test
    void aSuccessfulLoginResetsTheFailureCount() throws Exception {
        register("reset@college.edu", "21CS109");
        for (int i = 0; i < 4; i++) {
            mvc.perform(login("reset@college.edu", "Wr0ngPassword", "10.4.4.4"));
        }
        mvc.perform(login("reset@college.edu", PASSWORD, "10.4.4.4")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from login_attempt", Integer.class)).isZero();
        for (int i = 0; i < 4; i++) {
            mvc.perform(login("reset@college.edu", "Wr0ngPassword", "10.4.4.4"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void validatesTheRequestBody() throws Exception {
        mvc.perform(postJson("/api/v1/auth/login", "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.identifier").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void recordsTheLastLoginTime() throws Exception {
        register("last@college.edu", "21CS110");
        mvc.perform(login("last@college.edu", PASSWORD, "10.5.5.5")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select last_login_at is not null from app_user", Boolean.class)).isTrue();
    }
}
