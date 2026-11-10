package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class PasswordResetIntegrationTest extends IntegrationTestBase {

    private static final String NEW_PASSWORD = "Fr3shPassword";

    @BeforeEach
    void student() throws Exception {
        register("forgot@college.edu", "21CS301");
    }

    private void forgot(String email) throws Exception {
        mvc.perform(postJson("/api/v1/auth/forgot-password", json("{\"email\":\"%s\"}", email)))
                .andExpect(status().isAccepted());
    }

    private org.springframework.test.web.servlet.ResultActions reset(String token, String password) throws Exception {
        return mvc.perform(postJson("/api/v1/auth/reset-password",
                json("{\"token\":\"%s\",\"newPassword\":\"%s\"}", token, password)));
    }

    @Test
    void answers202AndSendsNothingForUnknownEmails() throws Exception {
        forgot("nobody@college.edu");
        assertThat(mailer.sent()).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from password_reset_token", Integer.class)).isZero();
    }

    @Test
    void answers202ForKnownEmailsAndSendsAResetLink() throws Exception {
        forgot("Forgot@College.edu");
        assertThat(mailer.sent()).hasSize(1);
        var mail = mailer.sent().get(0);
        assertThat(mail.to()).isEqualTo("forgot@college.edu");
        assertThat(mail.link()).startsWith("http://localhost:5173/reset-password?token=");
    }

    @Test
    void unknownAndKnownEmailsAreIndistinguishableToTheCaller() throws Exception {
        String known = mvc.perform(postJson("/api/v1/auth/forgot-password", "{\"email\":\"forgot@college.edu\"}"))
                .andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(postJson("/api/v1/auth/forgot-password", "{\"email\":\"zzz@college.edu\"}"))
                .andReturn().getResponse().getContentAsString();
        assertThat(known).isEqualTo(unknown).isEmpty();
    }

    @Test
    void storesOnlyAHashOfTheResetTokenWithAThirtyMinuteExpiry() throws Exception {
        forgot("forgot@college.edu");
        String raw = mailer.lastToken();
        assertThat(jdbc.queryForObject("select token_hash from password_reset_token", String.class))
                .isEqualTo(TokenCodec.hash(raw)).isNotEqualTo(raw);
        long minutes = jdbc.queryForObject(
                "select round(extract(epoch from (expires_at - created_at)) / 60) from password_reset_token", Long.class);
        assertThat(minutes).isEqualTo(30);
    }

    @Test
    void doesNotEmailDeactivatedAccounts() throws Exception {
        jdbc.update("update app_user set status = 'INACTIVE'");
        forgot("forgot@college.edu");
        assertThat(mailer.sent()).isEmpty();
    }

    @Test
    void resetsThePasswordAndTheTokenWorksOnlyOnce() throws Exception {
        forgot("forgot@college.edu");
        String token = mailer.lastToken();

        reset(token, NEW_PASSWORD).andExpect(status().isNoContent());
        mvc.perform(login("forgot@college.edu", NEW_PASSWORD, "10.7.0.1")).andExpect(status().isOk());
        mvc.perform(login("forgot@college.edu", PASSWORD, "10.7.0.1")).andExpect(status().isUnauthorized());

        reset(token, "An0therPassword")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("invalid_token"));
    }

    @Test
    void rejectsExpiredAndUnknownTokens() throws Exception {
        forgot("forgot@college.edu");
        String token = mailer.lastToken();
        jdbc.update("update password_reset_token set expires_at = now() - interval '1 second'");

        reset(token, NEW_PASSWORD).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("invalid_token"));
        reset("made-up-token", NEW_PASSWORD).andExpect(status().isBadRequest());
        mvc.perform(login("forgot@college.edu", PASSWORD, "10.7.0.2")).andExpect(status().isOk());
    }

    @Test
    void aNewRequestInvalidatesTheEarlierLink() throws Exception {
        forgot("forgot@college.edu");
        String older = mailer.lastToken();
        forgot("forgot@college.edu");
        String newer = mailer.lastToken();

        reset(older, NEW_PASSWORD).andExpect(status().isBadRequest());
        reset(newer, NEW_PASSWORD).andExpect(status().isNoContent());
    }

    @Test
    void enforcesThePasswordPolicyAndKeepsTheTokenUsable() throws Exception {
        forgot("forgot@college.edu");
        String token = mailer.lastToken();
        reset(token, "weak").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.newPassword").exists());
        reset(token, NEW_PASSWORD).andExpect(status().isNoContent());
    }

    @Test
    void resettingEndsEverySession() throws Exception {
        Cookie session = refreshCookie(mvc.perform(login("forgot@college.edu", PASSWORD, "10.7.0.3")).andReturn());
        forgot("forgot@college.edu");
        reset(mailer.lastToken(), NEW_PASSWORD).andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
    }
}
