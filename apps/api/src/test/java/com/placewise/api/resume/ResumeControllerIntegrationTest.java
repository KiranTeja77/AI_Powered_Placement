package com.placewise.api.resume;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.jayway.jsonpath.JsonPath;
import com.placewise.api.support.AiStub;
import com.placewise.api.support.AiStub.Mode;
import com.placewise.api.support.IntegrationTestBase;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.json.JsonMapper;

/** The whole resume path against PostgreSQL, with the analyzer replaced by a real HTTP stub. */
@SuppressWarnings("unchecked")
class ResumeControllerIntegrationTest extends IntegrationTestBase {

    private static final String SAMPLE = AiStub.sampleResume();
    private static final String UNAVAILABLE = "Resume analysis is temporarily unavailable.";

    @Autowired JsonMapper mapper;

    // ------------------------------------------------------------------ helpers

    private String student(String email, String rollNo) throws Exception {
        register(email, rollNo);
        return accessTokenFor(email);
    }

    private static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }

    private String analyzeBody(String text, String... roles) {
        return mapper.writeValueAsString(Map.of("text", text, "targetRoles", List.of(roles)));
    }

    private ResultActions analyze(String token, String text, String... roles) throws Exception {
        return mvc.perform(auth(post("/api/v1/resumes/analyze"), token)
                .contentType(MediaType.APPLICATION_JSON).content(analyzeBody(text, roles)));
    }

    private String analyzeOk(String token, String... roles) throws Exception {
        MvcResult result = analyze(token, SAMPLE, roles).andExpect(status().isCreated()).andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private ResultActions edit(String token, String id, List<String> confirm, List<String> remove, List<String> add)
            throws Exception {
        String body = mapper.writeValueAsString(Map.of(
                "confirmedSkillIds", confirm, "removedSkillIds", remove, "addedSkillIds", add));
        return mvc.perform(auth(patch("/api/v1/resumes/analyses/" + id + "/skills"), token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions fetch(String token, String id) throws Exception {
        return mvc.perform(auth(get("/api/v1/resumes/analyses/" + id), token));
    }

    private int analysisCount() {
        return jdbc.queryForObject("select count(*) from resume_analysis", Integer.class);
    }

    // ------------------------------------------------------------------ the full path

    @Test
    void analyzeThenListThenGetThenPatch() throws Exception {
        String token = student("path@college.edu", "21CS901");

        // analyze: validated, sent to the analyzer, stored and returned
        MvcResult created = analyze(token, SAMPLE, "backend-developer")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetRoles[0].slug").value("backend-developer"))
                .andExpect(jsonPath("$.targetRoles[0].name").value("Backend Developer"))
                .andExpect(jsonPath("$.result.engineVersion").value("1.0.0"))
                .andExpect(jsonPath("$.result.skills.length()").value(11))
                .andExpect(jsonPath("$.result.roles[0].score").value(30.8))
                .andExpect(jsonPath("$.result.roles[0].byImportance.length()").value(3))
                .andExpect(jsonPath("$.edits").doesNotExist())
                // possible matches are shown but never scored, so the effective list has 10, not 11
                .andExpect(jsonPath("$.effective.skills.length()").value(10))
                .andExpect(jsonPath("$.effective.roles[0].score").value(30.8))
                .andReturn();
        String body = created.getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        assertThat((List<String>) JsonPath.read(body, "$.effective.skills[*].id")).doesNotContain("kubernetes");
        assertThat(AiStub.SHARED.analyzeRequests()).singleElement().satisfies(sent -> {
            assertThat(sent).contains("\"target_roles\":[\"backend-developer\"]").contains("Campus Placement Portal");
        });

        Map<String, Object> row = jdbc.queryForMap(
                "select raw_text, engine_version, top_role, top_score, skill_count, confirmed_skills is null as unedited "
                        + "from resume_analysis where id = ?::uuid", id);
        assertThat(row.get("raw_text")).isEqualTo(SAMPLE);
        assertThat(row.get("engine_version")).isEqualTo("1.0.0");
        assertThat(row.get("top_role")).isEqualTo("backend-developer");
        assertThat(row.get("top_score").toString()).isEqualTo("30.8");
        assertThat(row.get("skill_count")).isEqualTo(10);
        assertThat(row.get("unedited")).isEqualTo(true);

        // list: the student's own history, newest first, small rows only
        mvc.perform(auth(get("/api/v1/resumes/analyses"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(id))
                .andExpect(jsonPath("$.items[0].topRole.name").value("Backend Developer"))
                .andExpect(jsonPath("$.items[0].topScore").value(30.8))
                .andExpect(jsonPath("$.items[0].skillCount").value(10))
                .andExpect(jsonPath("$.items[0].edited").value(false))
                .andExpect(jsonPath("$.items[0].rawText").doesNotExist())
                .andExpect(jsonPath("$.items[0].result").doesNotExist());

        // get: one analysis, same content
        fetch(token, id).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.result.skills.length()").value(11))
                .andExpect(jsonPath("$.rawText").doesNotExist());

        // patch: confirm the possible match, remove one skill, add one by hand
        MvcResult patched = edit(token, id, List.of("kubernetes"), List.of("git"), List.of("typescript"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.edits.confirmedSkillIds[0]").value("kubernetes"))
                .andExpect(jsonPath("$.edits.removedSkillIds[0]").value("git"))
                .andExpect(jsonPath("$.edits.addedSkillIds[0]").value("typescript"))
                .andExpect(jsonPath("$.effective.skills.length()").value(11))
                .andExpect(jsonPath("$.effective.roles[0].score").value(100.0))
                .andReturn();
        String patchedBody = patched.getResponse().getContentAsString();
        List<String> effectiveIds = JsonPath.read(patchedBody, "$.effective.skills[*].id");
        assertThat(effectiveIds).contains("kubernetes", "typescript").doesNotContain("git");
        assertThat((List<String>) JsonPath.read(patchedBody, "$.effective.skills[?(@.id=='kubernetes')].source")).containsExactly("confirmed");
        assertThat((List<String>) JsonPath.read(patchedBody, "$.effective.skills[?(@.id=='typescript')].source")).containsExactly("added");
        assertThat((List<Double>) JsonPath.read(patchedBody, "$.effective.skills[?(@.id=='typescript')].strength")).containsExactly(0.5);
        // the analyzer's own answer is untouched
        assertThat((List<Object>) JsonPath.read(patchedBody, "$.result.skills[?(@.id=='git')]")).hasSize(1);

        assertThat(AiStub.SHARED.compareRequests()).singleElement().satisfies(sent -> {
            assertThat(sent).contains("\"skill_id\":\"kubernetes\"").contains("\"skill_id\":\"typescript\"");
            assertThat(sent).doesNotContain("\"skill_id\":\"git\"").contains("\"target_roles\":[\"backend-developer\"]");
        });
        Map<String, Object> after = jdbc.queryForMap(
                "select top_score, skill_count, confirmed_skills is not null as edited from resume_analysis where id = ?::uuid", id);
        assertThat(after.get("top_score").toString()).isEqualTo("100.0");
        assertThat(after.get("skill_count")).isEqualTo(11);
        assertThat(after.get("edited")).isEqualTo(true);

        // the edit survives a reload and shows in the history
        fetch(token, id).andExpect(jsonPath("$.effective.roles[0].score").value(100.0))
                .andExpect(jsonPath("$.edits.confirmedSkillIds[0]").value("kubernetes"));
        mvc.perform(auth(get("/api/v1/resumes/analyses"), token))
                .andExpect(jsonPath("$.items[0].edited").value(true))
                .andExpect(jsonPath("$.items[0].topScore").value(100.0));

        // no edits resets to the analyzer's own answer without calling it again
        edit(token, id, List.of(), List.of(), List.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.edits").doesNotExist())
                .andExpect(jsonPath("$.effective.skills.length()").value(10))
                .andExpect(jsonPath("$.effective.roles[0].score").value(30.8));
        assertThat(AiStub.SHARED.compareRequests()).hasSize(1);
    }

    @Test
    void editsAreIdempotentAndDuplicatesAreIgnored() throws Exception {
        String token = student("idem@college.edu", "21CS902");
        String id = analyzeOk(token, "backend-developer");
        for (int i = 0; i < 2; i++) {
            edit(token, id, List.of("kubernetes", "kubernetes"), List.of(), List.of())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.effective.skills.length()").value(11));
        }
    }

    @Test
    void withNoTargetRolesTheAnalyzerScoresEveryRole() throws Exception {
        String token = student("all@college.edu", "21CS903");
        analyze(token, SAMPLE).andExpect(status().isCreated()).andExpect(jsonPath("$.targetRoles.length()").value(0));
        assertThat(AiStub.SHARED.analyzeRequests()).singleElement().satisfies(sent -> assertThat(sent).contains("\"target_roles\":[]"));
    }

    // ------------------------------------------------------------------ validation

    @Test
    void rejectsTextThatIsTooShortTooLongOrMissing() throws Exception {
        String token = student("val@college.edu", "21CS904");
        analyze(token, "a".repeat(199), "backend-developer")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("validation_failed"))
                .andExpect(jsonPath("$.errors.text").value("Use at least 200 characters"));
        // spaces around the text do not count toward the minimum
        analyze(token, " ".repeat(300) + "a".repeat(50) + " ".repeat(300)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.text").exists());
        analyze(token, "a".repeat(20_001)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.text").value("Use 20,000 characters or fewer"));
        mvc.perform(auth(post("/api/v1/resumes/analyze"), token).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.text").value("Paste your resume text"));
        assertThat(analysisCount()).isZero();
        assertThat(AiStub.SHARED.analyzeRequests()).isEmpty();
    }

    @Test
    void acceptsTheExactLimits() throws Exception {
        String token = student("lim@college.edu", "21CS905");
        analyze(token, "a".repeat(200)).andExpect(status().isCreated());
        analyze(token, "a".repeat(20_000)).andExpect(status().isCreated());
    }

    @Test
    void rejectsUnknownRolesNamingThem() throws Exception {
        String token = student("role@college.edu", "21CS906");
        analyze(token, SAMPLE, "backend-developer", "astronaut")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.targetRoles").value("Unknown role: astronaut"));
        assertThat(AiStub.SHARED.analyzeRequests()).isEmpty();
    }

    @Test
    void rejectsMoreThanFourteenRoles() throws Exception {
        String token = student("many@college.edu", "21CS907");
        String[] fifteen = java.util.stream.IntStream.range(0, 15).mapToObj(i -> "backend-developer").toArray(String[]::new);
        analyze(token, SAMPLE, fifteen).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.targetRoles").exists());
    }

    @Test
    void patchRejectsEditsThatDoNotMatchTheAnalysis() throws Exception {
        String token = student("bad@college.edu", "21CS908");
        String id = analyzeOk(token, "backend-developer");
        // "git" was found, not merely possible; "kubernetes" is possible, not found; "python" is already there
        edit(token, id, List.of("git"), List.of("kubernetes"), List.of("python", "not-a-skill"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.confirmedSkillIds").exists())
                .andExpect(jsonPath("$.errors.removedSkillIds").exists())
                .andExpect(jsonPath("$.errors.addedSkillIds").exists());
        mvc.perform(auth(patch("/api/v1/resumes/analyses/" + id + "/skills"), token)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        assertThat(AiStub.SHARED.compareRequests()).isEmpty();
    }

    // ------------------------------------------------------------------ who may see what

    @Test
    void aStudentCannotReadOrChangeAnotherStudentsAnalysis() throws Exception {
        String owner = student("owner@college.edu", "21CS910");
        String other = student("other@college.edu", "21CS911");
        String id = analyzeOk(owner, "backend-developer");

        fetch(other, id).andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("forbidden"));
        edit(other, id, List.of("kubernetes"), List.of(), List.of()).andExpect(status().isForbidden());
        assertThat(AiStub.SHARED.compareRequests()).isEmpty();
        assertThat(jdbc.queryForObject("select confirmed_skills is null from resume_analysis where id = ?::uuid",
                Boolean.class, id)).isTrue();

        mvc.perform(auth(get("/api/v1/resumes/analyses"), other))
                .andExpect(jsonPath("$.totalItems").value(0)).andExpect(jsonPath("$.items.length()").value(0));
        fetch(owner, id).andExpect(status().isOk());
    }

    @Test
    void unknownAndMalformedIdsAreNotFoundOrBadRequests() throws Exception {
        String token = student("nf@college.edu", "21CS912");
        fetch(token, UUID.randomUUID().toString()).andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        fetch(token, "not-a-uuid").andExpect(status().isBadRequest());
    }

    @Test
    void onlyStudentsMayUseTheResumeEndpoints() throws Exception {
        UUID someId = UUID.randomUUID();
        for (String role : List.of("FACULTY", "TP_HEAD", "ADMIN", "RECRUITER")) {
            String email = role.toLowerCase() + "@college.edu";
            insertUser(email, role, "ACTIVE");
            String token = accessTokenFor(email);
            analyze(token, SAMPLE).andExpect(status().isForbidden());
            mvc.perform(auth(get("/api/v1/resumes/analyses"), token)).andExpect(status().isForbidden());
            fetch(token, someId.toString()).andExpect(status().isForbidden());
            edit(token, someId.toString(), List.of(), List.of(), List.of()).andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/v1/resumes/analyze").contentType(MediaType.APPLICATION_JSON).content(analyzeBody(SAMPLE)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/resumes/analyses")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ the analyzer is unavailable

    @Test
    void whenTheAnalyzerFailsTheStudentGetsAClear503AndNothingIsSaved() throws Exception {
        String token = student("down@college.edu", "21CS913");
        for (Mode mode : List.of(Mode.DROP, Mode.ERROR_500, Mode.GARBAGE, Mode.SLOW)) {
            AiStub.SHARED.mode(mode);
            analyze(token, SAMPLE, "backend-developer")
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.code").value("analysis_unavailable"))
                    .andExpect(jsonPath("$.detail").value(UNAVAILABLE))
                    .andExpect(header().string("Retry-After", "30"));
        }
        assertThat(analysisCount()).isZero();
    }

    @Test
    void aSlowAnalyzerIsCutOffAtTheTimeLimit() throws Exception {
        String token = student("slow@college.edu", "21CS914");
        AiStub.SHARED.mode(Mode.SLOW);
        long started = System.nanoTime();
        analyze(token, SAMPLE).andExpect(status().isServiceUnavailable());
        assertThat((System.nanoTime() - started) / 1_000_000).isLessThan(2_500);
    }

    @Test
    void anEditThatCannotBeRecomputedLeavesTheAnalysisAsItWas() throws Exception {
        String token = student("patchdown@college.edu", "21CS915");
        String id = analyzeOk(token, "backend-developer");
        AiStub.SHARED.mode(Mode.DROP);
        edit(token, id, List.of("kubernetes"), List.of(), List.of())
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.detail").value(UNAVAILABLE));
        AiStub.SHARED.mode(Mode.OK);
        fetch(token, id).andExpect(jsonPath("$.edits").doesNotExist())
                .andExpect(jsonPath("$.effective.skills.length()").value(10));
        // reading and listing never need the analyzer
        AiStub.SHARED.mode(Mode.DROP);
        fetch(token, id).andExpect(status().isOk());
        mvc.perform(auth(get("/api/v1/resumes/analyses"), token)).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ history

    @Test
    void historyIsPaginatedNewestFirstAndPrivate() throws Exception {
        String token = student("hist@college.edu", "21CS916");
        String first = analyzeOk(token, "backend-developer");
        String second = analyzeOk(token, "data-analyst");
        String third = analyzeOk(token);

        MvcResult page0 = mvc.perform(auth(get("/api/v1/resumes/analyses?page=0&size=2"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn();
        List<String> ids = JsonPath.read(page0.getResponse().getContentAsString(), "$.items[*].id");
        assertThat(ids).containsExactly(third, second);
        mvc.perform(auth(get("/api/v1/resumes/analyses?page=1&size=2"), token))
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].id").value(first));
        mvc.perform(auth(get("/api/v1/resumes/analyses?size=1000"), token)).andExpect(jsonPath("$.size").value(50));
        mvc.perform(auth(get("/api/v1/resumes/analyses?page=-4&size=0"), token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(1));
    }

    // ------------------------------------------------------------------ privacy

    @Test
    void resumeTextNeverAppearsInTheLogs() throws Exception {
        String marker = "zq7-unmistakable-marker-" + UUID.randomUUID();
        String text = SAMPLE + "\nHOBBIES\n" + marker + "\n";
        String token = student("log@college.edu", "21CS917");

        Logger root = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        Level before = root.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        root.addAppender(appender);
        root.setLevel(Level.DEBUG);
        try {
            analyze(token, text, "backend-developer").andExpect(status().isCreated());
            AiStub.SHARED.mode(Mode.ERROR_500);
            analyze(token, text, "backend-developer").andExpect(status().isServiceUnavailable());
            AiStub.SHARED.mode(Mode.DROP);
            analyze(token, text).andExpect(status().isServiceUnavailable());
            analyze(token, marker).andExpect(status().isBadRequest());
        } finally {
            root.detachAppender(appender);
            root.setLevel(before);
        }
        assertThat(appender.list).isNotEmpty();
        for (ILoggingEvent event : appender.list) {
            assertThat(event.getFormattedMessage()).as("logger " + event.getLoggerName())
                    .doesNotContain("zq7-unmistakable-marker");
            if (event.getThrowableProxy() != null) {
                assertThat(event.getThrowableProxy().getMessage() == null ? "" : event.getThrowableProxy().getMessage())
                        .doesNotContain("zq7-unmistakable-marker");
            }
        }
    }
}
