package com.placewise.api.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.placewise.api.support.IntegrationTestBase;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.json.JsonMapper;

class CareerInterestControllerIntegrationTest extends IntegrationTestBase {

    private static final String URL = "/api/v1/me/career-interests";

    @Autowired JsonMapper mapper;

    private String student(String email, String rollNo) throws Exception {
        register(email, rollNo);
        return accessTokenFor(email);
    }

    private ResultActions save(String token, List<String> slugs) throws Exception {
        return mvc.perform(put(URL).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("roleSlugs", slugs))));
    }

    private ResultActions load(String token) throws Exception {
        return mvc.perform(get(URL).header("Authorization", "Bearer " + token));
    }

    @Test
    void startsEmpty() throws Exception {
        String token = student("ci1@college.edu", "21CS951");
        load(token).andExpect(status().isOk()).andExpect(jsonPath("$.roleSlugs.length()").value(0));
    }

    @Test
    void savesAndReturnsTheRolesInAStableOrder() throws Exception {
        String token = student("ci2@college.edu", "21CS952");
        save(token, List.of("qa-engineer", "backend-developer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleSlugs.length()").value(2));
        // ordered by role name, whatever order they were sent in
        load(token).andExpect(jsonPath("$.roleSlugs[0]").value("backend-developer"))
                .andExpect(jsonPath("$.roleSlugs[1]").value("qa-engineer"));
        assertThat(jdbc.queryForObject("select count(*) from career_interest", Integer.class)).isEqualTo(2);
    }

    @Test
    void sendingAListReplacesTheSavedOne() throws Exception {
        String token = student("ci3@college.edu", "21CS953");
        save(token, List.of("backend-developer", "data-analyst")).andExpect(status().isOk());
        save(token, List.of("data-analyst", "devops-engineer"))
                .andExpect(jsonPath("$.roleSlugs.length()").value(2))
                .andExpect(jsonPath("$.roleSlugs[0]").value("data-analyst"))
                .andExpect(jsonPath("$.roleSlugs[1]").value("devops-engineer"));
        assertThat(jdbc.queryForList(
                "select r.slug from career_interest ci join job_role r on r.id = ci.role_id order by r.slug",
                String.class)).containsExactly("data-analyst", "devops-engineer");
    }

    @Test
    void anEmptyListClearsTheInterests() throws Exception {
        String token = student("ci4@college.edu", "21CS954");
        save(token, List.of("backend-developer")).andExpect(status().isOk());
        save(token, List.of()).andExpect(status().isOk()).andExpect(jsonPath("$.roleSlugs.length()").value(0));
        assertThat(jdbc.queryForObject("select count(*) from career_interest", Integer.class)).isZero();
    }

    @Test
    void savingTheSameListTwiceChangesNothingAndDuplicatesAreIgnored() throws Exception {
        String token = student("ci5@college.edu", "21CS955");
        for (int i = 0; i < 2; i++) {
            save(token, List.of("backend-developer", "backend-developer"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.roleSlugs.length()").value(1));
        }
        assertThat(jdbc.queryForObject("select count(*) from career_interest", Integer.class)).isEqualTo(1);
    }

    @Test
    void rejectsUnknownRolesAndTooManyRolesWithoutChangingWhatIsSaved() throws Exception {
        String token = student("ci6@college.edu", "21CS956");
        save(token, List.of("backend-developer")).andExpect(status().isOk());

        save(token, List.of("backend-developer", "astronaut"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.roleSlugs").value("Unknown role: astronaut"));
        List<String> fifteen = IntStream.range(0, 15).mapToObj(i -> "role-" + i).toList();
        save(token, fifteen).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.roleSlugs").exists());
        mvc.perform(put(URL).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.roleSlugs").exists());

        load(token).andExpect(jsonPath("$.roleSlugs[0]").value("backend-developer"))
                .andExpect(jsonPath("$.roleSlugs.length()").value(1));
    }

    @Test
    void eachStudentSeesOnlyTheirOwnInterests() throws Exception {
        String first = student("ci7@college.edu", "21CS957");
        String second = student("ci8@college.edu", "21CS958");
        save(first, List.of("backend-developer")).andExpect(status().isOk());
        save(second, List.of("data-analyst", "qa-engineer")).andExpect(status().isOk());

        load(first).andExpect(jsonPath("$.roleSlugs.length()").value(1)).andExpect(jsonPath("$.roleSlugs[0]").value("backend-developer"));
        load(second).andExpect(jsonPath("$.roleSlugs.length()").value(2));
        save(first, List.of()).andExpect(status().isOk());
        load(second).andExpect(jsonPath("$.roleSlugs.length()").value(2));
    }

    @Test
    void onlySignedInStudentsMayUseIt() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("{\"roleSlugs\":[]}"))
                .andExpect(status().isUnauthorized());
        for (String role : List.of("FACULTY", "TP_HEAD", "ADMIN", "RECRUITER")) {
            String email = role.toLowerCase() + "@college.edu";
            insertUser(email, role, "ACTIVE");
            String token = accessTokenFor(email);
            load(token).andExpect(status().isForbidden());
            save(token, List.of("backend-developer")).andExpect(status().isForbidden());
        }
    }

    @Test
    void deletingTheStudentRemovesTheirInterests() throws Exception {
        String token = student("ci9@college.edu", "21CS959");
        save(token, List.of("backend-developer")).andExpect(status().isOk());
        jdbc.update("delete from app_user where email = ?", "ci9@college.edu");
        assertThat(jdbc.queryForObject("select count(*) from career_interest", Integer.class)).isZero();
    }
}
