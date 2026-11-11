package com.placewise.api.resume;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.placewise.api.common.AppProperties;
import com.placewise.api.resume.AnalysisResult.RoleReadiness;
import java.net.http.HttpClient;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

/**
 * Calls the internal resume-analysis service over HTTP with a hard time limit.
 *
 * <p>The service speaks snake_case; the API speaks camelCase, so responses are read with a
 * snake_case mapper into the same records the API serves. The resume text is only ever sent as the
 * request body: it is not logged, and neither are error messages, which could contain it.
 */
@Component
public class AiServiceClient {

    /** Thrown when the analyzer cannot be reached, is too slow or answers with an error. */
    public static class AiUnavailableException extends RuntimeException {
        public AiUnavailableException(String reason, Throwable cause) {
            super(reason, cause);
        }
    }

    /** The analyzer answered, but refused the request (for example edits that do not fit). */
    public static class AiRejectedException extends RuntimeException {
        public AiRejectedException(Throwable cause) {
            super("The analyzer rejected the request", cause);
        }
    }

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient client;
    private final JsonMapper snakeCase;

    AiServiceClient(AppProperties props, JsonMapper json) {
        var timeout = props.ai().timeout();
        // HTTP/1.1 only: the JDK client otherwise tries an HTTP/2 upgrade on plain connections, which
        // the Python server (uvicorn) does not support and answers by mishandling the request.
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(timeout)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(timeout);
        this.client = RestClient.builder()
                .baseUrl(props.ai().baseUrl())
                .requestFactory(factory)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.snakeCase = json.rebuild()
                .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
    }

    public AnalysisResult analyze(String text, List<String> targetRoles) {
        String body = post("/analyze", new AnalyzeCall(text, targetRoles));
        return parse(body, AnalysisResult.class);
    }

    /** The student's corrections, relative to the analyzer's own answer. */
    public record Edits(List<String> confirmed, List<String> removed, List<String> added) {}

    /** The skills that count after the edits, with the scores and suggestions rebuilt from them. */
    public record Revision(
            List<ResumeDtos.EffectiveSkill> skills,
            List<RoleReadiness> roles,
            List<AnalysisResult.AnalysisSuggestion> suggestions) {}

    /**
     * Re-reads the stored resume text, applies the edits and returns the new skills, role
     * readiness and suggestions. The text is sent again from the database; the browser never
     * resends it.
     */
    public Revision revise(String text, List<String> targetRoles, Edits edits) {
        String body = post("/revise", new ReviseCall(text, targetRoles, edits.confirmed(), edits.removed(),
                edits.added()));
        return parse(body, Revision.class);
    }

    /** The request body of /analyze. Its toString hides the text: debug logging prints bodies. */
    private record AnalyzeCall(
            @JsonProperty("text") String text, @JsonProperty("target_roles") List<String> targetRoles) {
        @Override
        public String toString() {
            return "AnalyzeCall[text=<" + text.length() + " characters>, targetRoles=" + targetRoles + "]";
        }
    }

    private record ReviseCall(
            @JsonProperty("text") String text,
            @JsonProperty("target_roles") List<String> targetRoles,
            @JsonProperty("confirmed_skill_ids") List<String> confirmed,
            @JsonProperty("removed_skill_ids") List<String> removed,
            @JsonProperty("added_skill_ids") List<String> added) {
        @Override
        public String toString() {
            return "ReviseCall[text=<" + text.length() + " characters>, targetRoles=" + targetRoles + "]";
        }
    }

    private String post(String path, Object body) {
        try {
            String response = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body)
                    .retrieve().body(String.class);
            if (response == null || response.isBlank()) {
                throw new AiUnavailableException("The analyzer returned an empty answer", null);
            }
            return response;
        } catch (AiUnavailableException e) {
            throw e;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 422) {
                // Not an outage: the request itself was refused. Only the status is logged.
                log.warn("Resume analyzer refused the request to {}", path);
                throw new AiRejectedException(e);
            }
            log.warn("Resume analyzer call to {} failed: {}", path, e.getClass().getSimpleName());
            throw new AiUnavailableException("The analyzer could not be reached or answered with an error", e);
        } catch (RuntimeException e) {
            // Only the exception type is logged: its message can include request details.
            log.warn("Resume analyzer call to {} failed: {}", path, e.getClass().getSimpleName());
            throw new AiUnavailableException("The analyzer could not be reached or answered with an error", e);
        }
    }

    private <T> T parse(String body, Class<T> type) {
        try {
            return snakeCase.readValue(body, type);
        } catch (RuntimeException e) {
            log.warn("Resume analyzer answer could not be read: {}", e.getClass().getSimpleName());
            throw new AiUnavailableException("The analyzer answered in an unexpected format", e);
        }
    }
}
