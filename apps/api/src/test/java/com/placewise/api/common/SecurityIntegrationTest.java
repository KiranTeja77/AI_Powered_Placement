package com.placewise.api.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;

class SecurityIntegrationTest extends IntegrationTestBase {

    static Stream<String> nonAdminRoles() {
        return Stream.of("STUDENT", "FACULTY", "TP_HEAD", "RECRUITER");
    }

    @ParameterizedTest
    @MethodSource("nonAdminRoles")
    void adminRoutesAreForbiddenToOtherRoles(String role) throws Exception {
        insertUser(role.toLowerCase() + "@college.edu", role, "ACTIVE");
        mvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + accessTokenFor(role.toLowerCase() + "@college.edu")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("forbidden"));
    }

    @Test
    void adminsPassAuthorizationAndReachRouting() throws Exception {
        insertUser("admin@college.edu", "ADMIN", "ACTIVE");
        // This admin path does not exist, so a 404 (not 401/403) proves authorization let the request through.
        mvc.perform(get("/api/v1/admin/no-such-endpoint")
                        .header("Authorization", "Bearer " + accessTokenFor("admin@college.edu")))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousRequestsToProtectedRoutesGet401ProblemJson() throws Exception {
        mvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
        mvc.perform(get("/api/v1/anything-else")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsMalformedAndForgedBearerTokens() throws Exception {
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer garbage")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer a.b.c")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", "Basic dXNlcjpwYXNz")).andExpect(status().isUnauthorized());
    }

    @Test
    void aTokenWithTheRoleClaimEditedIsRejected() throws Exception {
        register("forge@college.edu", "21CS501");
        String token = accessTokenFor("forge@college.edu");
        String[] parts = token.split("\\.");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        String forged = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                payload.replace("STUDENT", "ADMIN").getBytes());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + parts[0] + "." + forged + "." + parts[2]))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthAndDepartmentsArePublic() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/departments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[*].code").value(org.hamcrest.Matchers.containsInAnyOrder(
                        "CSE", "IT", "ECE", "EEE", "MECH", "CIVIL")));
    }

    @Test
    void allowsCorsForTheWebOriginOnly() throws Exception {
        mvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));

        var denied = mvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andReturn();
        assertThat(denied.getResponse().getHeader("Access-Control-Allow-Origin")).isNull();
    }

    @Test
    void publishesTheOpenApiDocument() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/auth/login']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/me']").exists());
    }

    @Test
    void everyApiResponseCarriesTheSecurityHeaders() throws Exception {
        // A normal answer, a refusal and an error all get them, because the headers are written
        // before the request is handled.
        String csp = "default-src 'none'; frame-ancestors 'none'";
        for (var request : java.util.List.of(
                get("/api/v1/health"),
                get("/api/v1/me"),
                get("/api/v1/no-such-endpoint"))) {
            mvc.perform(request)
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                    .andExpect(header().string("X-Frame-Options", "DENY"))
                    .andExpect(header().string("Referrer-Policy", "no-referrer"))
                    .andExpect(header().string("Content-Security-Policy", csp));
        }
        mvc.perform(postJson("/api/v1/auth/login", "{not json"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", csp));
    }

    @Test
    void theDocumentationPagesKeepTheBasicHeadersButNotTheStrictPolicy() throws Exception {
        // Swagger UI needs its own scripts, so the API-only policy is not applied to it.
        mvc.perform(get("/v3/api-docs"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().doesNotExist("Content-Security-Policy"));
    }

    @Test
    void malformedJsonIsAProblemNotAStackTrace() throws Exception {
        mvc.perform(postJson("/api/v1/auth/login", "{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }
}
