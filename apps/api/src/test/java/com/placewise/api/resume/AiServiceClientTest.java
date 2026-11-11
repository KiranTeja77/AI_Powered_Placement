package com.placewise.api.resume;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.placewise.api.common.AppProperties;
import com.placewise.api.resume.AiServiceClient.AiUnavailableException;
import com.placewise.api.resume.AiServiceClient.SkillStrength;
import com.placewise.api.support.AiStub;
import com.placewise.api.support.AiStub.Mode;
import java.net.ServerSocket;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** The client against a real HTTP server, so timeouts and failures are the real thing. */
class AiServiceClientTest {

    private AiStub stub;

    @BeforeEach
    void start() {
        stub = new AiStub();
    }

    @AfterEach
    void stop() {
        stub.close();
    }

    private AiServiceClient client(String baseUrl, Duration timeout) {
        AppProperties props = new AppProperties("http://localhost",
                new AppProperties.Jwt("x".repeat(32), Duration.ofMinutes(15)),
                new AppProperties.Auth(Duration.ofDays(7), Duration.ofMinutes(30), 4, 5, Duration.ofMinutes(15)),
                new AppProperties.Cookie(true), new AppProperties.Mail("a@b.c"), new AppProperties.Admin(null, null),
                new AppProperties.Ai(baseUrl, timeout));
        return new AiServiceClient(props, JsonMapper.builder().build());
    }

    @Test
    void readsTheAnalyzersSnakeCaseAnswerIntoCamelCaseRecords() {
        AnalysisResult result = client(stub.url(), Duration.ofSeconds(5))
                .analyze(AiStub.sampleResume(), List.of("backend-developer"));

        assertThat(result.engineVersion()).isEqualTo("1.0.0");
        assertThat(result.textLength()).isEqualTo(AiStub.sampleResume().length());
        assertThat(result.skills()).hasSize(11);
        AnalysisResult.AnalysisSkill docker = result.skills().stream().filter(s -> s.id().equals("docker")).findFirst().orElseThrow();
        assertThat(docker.status()).isEqualTo("detected");
        assertThat(docker.grade()).isEqualTo("applied");
        assertThat(docker.countsTowardScore()).isTrue();
        assertThat(docker.evidence().get(0).matchedText()).isEqualTo("Docker");
        assertThat(result.roles().get(0).roleId()).isEqualTo("backend-developer");
        assertThat(result.roles().get(0).byImportance()).hasSize(3);
        assertThat(result.fields().emails().get(0).text()).isEqualTo("kiran.teja@example.com");
        assertThat(result.fields().cgpa().value()).isEqualTo(8.5);
    }

    @Test
    void evidencePointsAtTheSubmittedText() {
        String text = AiStub.sampleResume();
        AnalysisResult result = client(stub.url(), Duration.ofSeconds(5)).analyze(text, List.of());
        for (var skill : result.skills()) {
            for (var e : skill.evidence()) {
                assertThat(text.substring(e.start(), e.end())).isEqualTo(e.matchedText());
            }
        }
    }

    @Test
    void sendsTheTextAndRolesInTheFormTheAnalyzerExpects() {
        client(stub.url(), Duration.ofSeconds(5)).analyze(AiStub.sampleResume(), List.of("qa-engineer"));
        assertThat(stub.analyzeRequests()).singleElement().satisfies(body -> {
            assertThat(body).contains("\"target_roles\":[\"qa-engineer\"]");
            assertThat(body).contains("Campus Placement Portal");
        });
    }

    @Test
    void compareSendsSkillIdsAndStrengthsAndReturnsTheRecomputedRoles() {
        var roles = client(stub.url(), Duration.ofSeconds(5)).compare(
                List.of(new SkillStrength("git", 1.0), new SkillStrength("sql", 0.5)), List.of("backend-developer"));
        assertThat(stub.compareRequests()).singleElement().satisfies(body -> {
            assertThat(body).contains("\"skill_id\":\"git\"").contains("\"strength\":0.5");
        });
        assertThat(roles).singleElement().satisfies(r -> {
            assertThat(r.roleId()).isEqualTo("backend-developer");
            assertThat(r.score()).isEqualTo(20.0);
        });
    }

    @Test
    void aSlowAnalyzerIsGivenUpOnAtTheTimeLimit() {
        stub.mode(Mode.SLOW);
        long started = System.nanoTime();
        assertThatThrownBy(() -> client(stub.url(), Duration.ofMillis(700)).analyze(AiStub.sampleResume(), List.of()))
                .isInstanceOf(AiUnavailableException.class);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
    }

    @Test
    void anAnalyzerThatIsNotRunningIsReportedAsUnavailable() throws Exception {
        int freePort;
        try (ServerSocket socket = new ServerSocket(0)) {
            freePort = socket.getLocalPort();
        }
        assertThatThrownBy(() -> client("http://127.0.0.1:" + freePort, Duration.ofSeconds(2))
                .analyze(AiStub.sampleResume(), List.of())).isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void errorStatusesDroppedConnectionsAndGarbageAreAllReportedAsUnavailable() {
        for (Mode mode : List.of(Mode.ERROR_500, Mode.DROP, Mode.GARBAGE)) {
            stub.mode(mode);
            assertThatThrownBy(() -> client(stub.url(), Duration.ofSeconds(2)).analyze(AiStub.sampleResume(), List.of()))
                    .as(mode.name()).isInstanceOf(AiUnavailableException.class);
        }
    }

    @Test
    void theFailureMessageNeverContainsTheResumeText() {
        stub.mode(Mode.ERROR_500);
        String marker = "zq7-unmistakable-marker-" + "x".repeat(200);
        Throwable error = org.assertj.core.api.Assertions.catchThrowable(
                () -> client(stub.url(), Duration.ofSeconds(2)).analyze(marker, List.of()));
        assertThat(error).isInstanceOf(AiUnavailableException.class);
        for (Throwable t = error; t != null; t = t.getCause()) {
            assertThat(String.valueOf(t.getMessage())).doesNotContain("zq7-unmistakable-marker");
        }
    }
}
