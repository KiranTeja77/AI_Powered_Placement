package com.placewise.api.support;

import com.jayway.jsonpath.JsonPath;
import com.placewise.api.TestcontainersConfiguration;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Boots the whole application against a real PostgreSQL 18 container. Mail is captured in memory
 * and BCrypt uses a low cost so the suite stays fast (production uses 12).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestMailConfig.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-test-secret-test-secret-0123456789",
        "app.auth.bcrypt-strength=4",
        "app.admin.email=",
        "app.admin.password="
})
public abstract class IntegrationTestBase {

    public static final String PASSWORD = "Sup3rSecret";

    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected RecordingMailer mailer;
    @Autowired protected PasswordEncoder encoder;

    @BeforeEach
    protected void cleanDatabase() {
        jdbc.execute("TRUNCATE login_attempt, password_reset_token, refresh_token, faculty_assignment, "
                + "student, app_user RESTART IDENTITY CASCADE");
        mailer.clear();
    }

    protected UUID departmentId(String code) {
        return jdbc.queryForObject("select id from department where code = ?", UUID.class, code);
    }

    protected static String json(String template, Object... args) {
        return template.formatted(args);
    }

    /** Registers a student through the API. */
    protected void register(String email, String rollNo) throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", json("""
                {"fullName":"Test Student","email":"%s","rollNo":"%s","departmentId":"%s",
                 "graduationYear":2027,"password":"%s"}""", email, rollNo, departmentId("CSE"), PASSWORD)))
                .andReturn();
    }

    protected MockHttpServletRequestBuilder postJson(String url, String body) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    protected MockHttpServletRequestBuilder login(String identifier, String password, String ip) {
        return postJson("/api/v1/auth/login", json("{\"identifier\":\"%s\",\"password\":\"%s\"}", identifier, password))
                .with(r -> {
                    r.setRemoteAddr(ip);
                    return r;
                });
    }

    protected static String read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }

    protected static Cookie refreshCookie(MvcResult result) {
        return result.getResponse().getCookie("refresh_token");
    }

    /** Inserts an account for any role directly, as an admin would create staff. */
    protected UUID insertUser(String email, String role, String status) {
        return jdbc.queryForObject(
                "insert into app_user (email, password_hash, full_name, role, status) "
                        + "values (?, ?, 'Staff Member', ?, ?) returning id",
                UUID.class, email, encoder.encode(PASSWORD), role, status);
    }

    /** Signs in with the shared test password and returns the access token. */
    protected String accessTokenFor(String identifier) throws Exception {
        MvcResult result = mvc.perform(login(identifier, PASSWORD, "10.9.9.9")).andReturn();
        return read(result, "$.accessToken");
    }
}
