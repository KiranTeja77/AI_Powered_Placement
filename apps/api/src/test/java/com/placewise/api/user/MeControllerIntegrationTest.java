package com.placewise.api.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class MeControllerIntegrationTest extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void signIn() throws Exception {
        register("me@college.edu", "21CS401");
        token = accessTokenFor("me@college.edu");
    }

    private org.springframework.test.web.servlet.ResultActions change(String current, String next) throws Exception {
        return mvc.perform(postJson("/api/v1/me/password",
                json("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}", current, next))
                .header("Authorization", "Bearer " + token));
    }

    @Test
    void returnsTheSignedInStudentsProfile() throws Exception {
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@college.edu"))
                .andExpect(jsonPath("$.fullName").value("Test Student"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.student.rollNo").value("21CS401"))
                .andExpect(jsonPath("$.student.graduationYear").value(2027))
                .andExpect(jsonPath("$.department.code").value("CSE"));
    }

    @Test
    void returnsStaffProfilesWithoutStudentData() throws Exception {
        insertUser("staff@college.edu", "FACULTY", "ACTIVE");
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + accessTokenFor("staff@college.edu")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("FACULTY"))
                .andExpect(jsonPath("$.student").doesNotExist());
    }

    @Test
    void requiresAToken() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mvc.perform(post("/api/v1/me/password")).andExpect(status().isUnauthorized());
    }

    @Test
    void changesThePasswordAndEndsAllSessions() throws Exception {
        Cookie session = refreshCookie(mvc.perform(login("me@college.edu", PASSWORD, "10.8.0.1")).andReturn());

        change(PASSWORD, "Br4ndNewPass").andExpect(status().isNoContent());

        mvc.perform(login("me@college.edu", "Br4ndNewPass", "10.8.0.2")).andExpect(status().isOk());
        mvc.perform(login("me@college.edu", PASSWORD, "10.8.0.2")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAWrongCurrentPassword() throws Exception {
        change("Wr0ngPassword", "Br4ndNewPass")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.currentPassword").exists());
        mvc.perform(login("me@college.edu", PASSWORD, "10.8.0.3")).andExpect(status().isOk());
    }

    @Test
    void rejectsAWeakOrUnchangedNewPassword() throws Exception {
        change(PASSWORD, "weak").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.newPassword").exists());
        change(PASSWORD, PASSWORD).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.newPassword").exists());
    }

    @Test
    void anAccessTokenStopsWorkingOnceTheAccountIsDeactivated() throws Exception {
        jdbc.update("update app_user set status = 'INACTIVE'");
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("select status from app_user", String.class)).isEqualTo("INACTIVE");
    }
}
