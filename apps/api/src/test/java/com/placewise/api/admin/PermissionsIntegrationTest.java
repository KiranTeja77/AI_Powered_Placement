package com.placewise.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.common.AccessRules;
import com.placewise.api.support.IntegrationTestBase;
import com.placewise.api.user.Role;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class PermissionsIntegrationTest extends IntegrationTestBase {

    private static final String URL = "/api/v1/admin/permissions";

    private Map<Role, String> tokens() throws Exception {
        Map<Role, String> tokens = new LinkedHashMap<>();
        register("student@college.edu", "21CS001");
        tokens.put(Role.STUDENT, accessTokenFor("student@college.edu"));
        for (Role role : List.of(Role.FACULTY, Role.TP_HEAD, Role.RECRUITER, Role.ADMIN)) {
            String email = role.name().toLowerCase() + "@college.edu";
            insertUser(email, role.name(), "ACTIVE");
            tokens.put(role, accessTokenFor(email));
        }
        return tokens;
    }

    private MockHttpServletRequestBuilder as(String path, String token) {
        MockHttpServletRequestBuilder request = get(path);
        return token == null ? request : request.header("Authorization", "Bearer " + token);
    }

    @Test
    void onlyAdminsCanReadTheMatrix() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        Map<Role, String> tokens = tokens();
        for (Role role : tokens.keySet()) {
            int expected = role == Role.ADMIN ? 200 : 403;
            assertThat(mvc.perform(as(URL, tokens.get(role))).andReturn().getResponse().getStatus())
                    .as("%s reading the matrix", role).isEqualTo(expected);
        }
    }

    @Test
    void theMatrixListsEveryRoleAndEveryRuleWithWhoHoldsIt() throws Exception {
        String admin = tokens().get(Role.ADMIN);
        mvc.perform(as(URL, admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.roles.length()").value(5))
                .andExpect(jsonPath("$.roles[0].id").value("STUDENT"))
                .andExpect(jsonPath("$.roles[2].label").value("T&P head"))
                .andExpect(jsonPath("$.permissions.length()").value(AccessRules.RULES.size()))
                // Admin-only, student-only and open-to-everyone rows, as the security rules say.
                .andExpect(jsonPath("$.grants.admin.length()").value(1))
                .andExpect(jsonPath("$.grants.admin[0]").value("ADMIN"))
                .andExpect(jsonPath("$.grants.resumes.length()").value(1))
                .andExpect(jsonPath("$.grants.resumes[0]").value("STUDENT"))
                .andExpect(jsonPath("$.grants.account.length()").value(5))
                .andExpect(jsonPath("$.grants.health.length()").value(5))
                .andExpect(jsonPath("$.permissions[?(@.id=='admin')].access").value("roles"))
                .andExpect(jsonPath("$.permissions[?(@.id=='health')].access").value("public"))
                .andExpect(jsonPath("$.permissions[?(@.id=='account')].access").value("signed_in"))
                .andExpect(jsonPath("$.permissions[4].id").value("admin"))
                .andExpect(jsonPath("$.permissions[4].endpoints[0]").value("/api/v1/admin/**"))
                .andExpect(jsonPath("$.permissions[2].id").value("auth"))
                .andExpect(jsonPath("$.permissions[2].endpoints.length()").value(6))
                .andExpect(jsonPath("$.permissions[2].endpoints[1]").value("POST /api/v1/auth/login"));
    }

    /**
     * The point of deriving the matrix from the rules: for every rule that has a sample path, each
     * role is really let in or really refused, exactly as the matrix says. A rule that is listed
     * but not enforced (or enforced but not listed correctly) fails here.
     */
    @Test
    void everyRuleBehavesAsTheMatrixDescribesForEveryRole() throws Exception {
        Map<Role, String> tokens = tokens();
        int checked = 0;
        for (AccessRules.Rule rule : AccessRules.RULES) {
            if (rule.sample() == null) {
                continue;
            }
            if (rule.access() == AccessRules.Access.PUBLIC) {
                int anonymous = mvc.perform(as(rule.sample(), null)).andReturn().getResponse().getStatus();
                assertThat(anonymous).as("%s without signing in", rule.id()).isNotIn(401, 403);
                checked++;
            }
            for (Role role : Role.values()) {
                MvcResult result = mvc.perform(as(rule.sample(), tokens.get(role))).andReturn();
                int actual = result.getResponse().getStatus();
                if (rule.allows(role)) {
                    assertThat(actual).as("%s as %s should be allowed", rule.id(), role).isNotIn(401, 403);
                } else {
                    assertThat(actual).as("%s as %s should be refused", rule.id(), role).isEqualTo(403);
                }
                checked++;
            }
        }
        assertThat(checked).isGreaterThan(30);
    }

    @Test
    void anyOtherPathNeedsASignedInAccount() throws Exception {
        mvc.perform(get("/api/v1/something-not-listed")).andExpect(status().isUnauthorized());
        Map<Role, String> tokens = tokens();
        for (String token : tokens.values()) {
            assertThat(mvc.perform(as("/api/v1/something-not-listed", token)).andReturn().getResponse().getStatus())
                    .isEqualTo(404);
        }
    }
}
