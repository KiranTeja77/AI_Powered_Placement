package com.placewise.api.role;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.placewise.api.support.IntegrationTestBase;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@SuppressWarnings("unchecked")
class CatalogueControllerIntegrationTest extends IntegrationTestBase {

    @Test
    void rolesAndSkillsRequireSignIn() throws Exception {
        mvc.perform(get("/api/v1/roles"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mvc.perform(get("/api/v1/skills")).andExpect(status().isUnauthorized());
    }

    @Test
    void returnsTheFourteenRolesWithTheirSkillsAndImportance() throws Exception {
        register("cat@college.edu", "21CS801");
        String body = mvc.perform(get("/api/v1/roles").header("Authorization", "Bearer " + accessTokenFor("cat@college.edu")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(14))
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> roles = JsonPath.read(body, "$");
        Map<String, Object> backend = roles.stream().filter(r -> "backend-developer".equals(r.get("slug"))).findFirst().orElseThrow();
        assertThat(backend.get("name")).isEqualTo("Backend Developer");
        List<String> branches = (List<String>) backend.get("branches");
        assertThat(branches).contains("CSE");

        List<Map<String, Object>> skills = JsonPath.read(body, "$[?(@.slug=='backend-developer')].skills[*]");
        assertThat(skills).isNotEmpty();
        assertThat(skills).allSatisfy(s -> assertThat(s.get("importance")).isIn("core", "important", "bonus"));
        // Core skills come first, so a student sees what matters most at the top.
        assertThat(skills.get(0).get("importance")).isEqualTo("core");
        assertThat(skills).anySatisfy(s -> {
            assertThat(s.get("slug")).isEqualTo("rest-api");
            assertThat(s.get("name")).isEqualTo("REST API");
            assertThat(s.get("importance")).isEqualTo("core");
        });
    }

    @Test
    void everyRoleHasSkillsAtAllThreeLevels() throws Exception {
        insertUser("fac@college.edu", "FACULTY", "ACTIVE");
        String body = mvc.perform(get("/api/v1/roles").header("Authorization", "Bearer " + accessTokenFor("fac@college.edu")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> slugs = JsonPath.read(body, "$[*].slug");
        for (String slug : slugs) {
            List<String> levels = JsonPath.read(body, "$[?(@.slug=='" + slug + "')].skills[*].importance");
            assertThat(levels).contains("core", "important", "bonus");
        }
    }

    @Test
    void returnsTheWholeSkillCatalogueSortedByCategory() throws Exception {
        register("skills@college.edu", "21CS802");
        String body = mvc.perform(get("/api/v1/skills").header("Authorization", "Bearer " + accessTokenFor("skills@college.edu")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug=='python')].name").value("Python"))
                .andReturn().getResponse().getContentAsString();
        List<String> categories = JsonPath.read(body, "$[*].category");
        assertThat(categories.size()).isGreaterThan(400);
        assertThat(categories).isSorted();
    }
}
