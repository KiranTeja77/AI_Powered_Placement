package com.placewise.api.resume;

import com.placewise.api.common.AppProperties;
import com.placewise.api.resume.AnalysisResult.RoleReadiness;
import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
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

    public record SkillStrength(String skillId, double strength) {}

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient client;
    private final JsonMapper snakeCase;

    AiServiceClient(AppProperties props, JsonMapper json) {
        var timeout = props.ai().timeout();
        HttpClient http = HttpClient.newBuilder().connectTimeout(timeout).build();
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
        String body = post("/analyze", Map.of("text", text, "target_roles", targetRoles));
        return parse(body, AnalysisResult.class);
    }

    /** Recomputes role readiness from a list of skills, without the resume text. */
    public List<RoleReadiness> compare(List<SkillStrength> skills, List<String> targetRoles) {
        List<Map<String, Object>> payload = skills.stream()
                .map(s -> Map.<String, Object>of("skill_id", s.skillId(), "strength", s.strength()))
                .toList();
        String body = post("/compare", Map.of("skills", payload, "target_roles", targetRoles));
        return parse(body, CompareResponse.class).roles();
    }

    private record CompareResponse(List<RoleReadiness> roles) {}

    private String post(String path, Map<String, Object> body) {
        try {
            String response = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body)
                    .retrieve().body(String.class);
            if (response == null || response.isBlank()) {
                throw new AiUnavailableException("The analyzer returned an empty answer", null);
            }
            return response;
        } catch (AiUnavailableException e) {
            throw e;
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
