package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class RegistrationIntegrationTest extends IntegrationTestBase {

    private String body(String email, String rollNo, String password, Object departmentId) {
        return json("""
                {"fullName":"Asha Rao","email":"%s","rollNo":"%s","departmentId":"%s",
                 "graduationYear":2027,"password":"%s"}""", email, rollNo, departmentId, password);
    }

    @Test
    void registersAStudentAndNeverReturnsPasswordData() throws Exception {
        MvcResult result = mvc.perform(postJson("/api/v1/auth/register",
                        body("Asha.Rao@College.EDU", "21cs001", PASSWORD, departmentId("CSE"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.email").value("asha.rao@college.edu"))
                .andExpect(jsonPath("$.student.rollNo").value("21CS001"))
                .andExpect(jsonPath("$.department.code").value("CSE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("$2");

        String stored = jdbc.queryForObject("select password_hash from app_user", String.class);
        assertThat(stored).startsWith("$2").isNotEqualTo(PASSWORD);
    }

    @Test
    void usesTimeOrderedUuidsForIds() throws Exception {
        register("a@college.edu", "21CS010");
        String id = jdbc.queryForObject("select id::text from app_user", String.class);
        assertThat(id).matches("[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
    }

    @Test
    void rejectsADuplicateEmailCaseInsensitively() throws Exception {
        register("dup@college.edu", "21CS011");
        mvc.perform(postJson("/api/v1/auth/register", body("DUP@college.edu", "21CS012", PASSWORD, departmentId("CSE"))))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.rollNo").doesNotExist());
    }

    @Test
    void rejectsADuplicateRollNumber() throws Exception {
        register("one@college.edu", "21CS013");
        mvc.perform(postJson("/api/v1/auth/register", body("two@college.edu", "21cs013", PASSWORD, departmentId("IT"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.rollNo").exists());
    }

    @Test
    void rejectsWeakPasswordsWithAFieldError() throws Exception {
        for (String weak : new String[] {"short1", "onlyletters", "12345678"}) {
            mvc.perform(postJson("/api/v1/auth/register", body("w@college.edu", "21CS014", weak, departmentId("CSE"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.code").value("validation_failed"))
                    .andExpect(jsonPath("$.errors.password").value("Use at least 8 characters with a letter and a number"));
        }
    }

    @Test
    void rejectsInvalidEmailAndUnknownDepartment() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", body("not-an-email", "21CS015", PASSWORD, departmentId("CSE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
        mvc.perform(postJson("/api/v1/auth/register",
                        body("ok@college.edu", "21CS016", PASSWORD, "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.departmentId").exists());
        assertThat(jdbc.queryForObject("select count(*) from app_user", Integer.class)).isZero();
    }

    @Test
    void rejectsMissingFields() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.fullName").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.rollNo").exists())
                .andExpect(jsonPath("$.errors.departmentId").exists())
                .andExpect(jsonPath("$.errors.graduationYear").exists());
    }

    @Test
    void registrationCannotChooseARole() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", json("""
                {"fullName":"Sneaky","email":"s@college.edu","rollNo":"21CS017","departmentId":"%s",
                 "graduationYear":2027,"password":"%s","role":"ADMIN"}""", departmentId("CSE"), PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }
}
