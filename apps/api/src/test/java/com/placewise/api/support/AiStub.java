package com.placewise.api.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * A stand-in for the resume-analysis service: a real HTTP server on a random port, so timeouts,
 * dropped connections and error statuses behave as they would against the real thing.
 *
 * <p>/analyze answers with a response generated once by the real analyzer for sample-resume.txt.
 * /revise applies the edits it is given to that same analysis, the way the real service does, and
 * builds a small deterministic score and suggestion so a test can tell the edit was applied.
 */
public final class AiStub implements AutoCloseable {

    /** REJECT makes /revise answer 422, as the real service does for edits that do not fit. */
    public enum Mode { OK, SLOW, ERROR_500, DROP, GARBAGE, REJECT }

    // Declared before SHARED: the constructor uses it.
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    /** One server for the whole test JVM; tests call {@link #reset()} before they run. */
    public static final AiStub SHARED = new AiStub();

    private final HttpServer server;
    private final String analyzeResponse;
    private final JsonNode analysis;
    private volatile Mode mode = Mode.OK;
    private final List<String> analyzeRequests = new CopyOnWriteArrayList<>();
    private final List<String> reviseRequests = new CopyOnWriteArrayList<>();

    public AiStub() {
        try {
            analyzeResponse = readResource("/ai/analyze-backend.json");
            analysis = MAPPER.readTree(analyzeResponse);
            server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            server.createContext("/analyze", exchange -> handle(exchange, true));
            server.createContext("/revise", exchange -> handle(exchange, false));
            // Several requests at once: a deliberately slow one must not block the next test's.
            server.setExecutor(Executors.newCachedThreadPool());
            server.start();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public void mode(Mode mode) {
        this.mode = mode;
    }

    public void reset() {
        mode = Mode.OK;
        analyzeRequests.clear();
        reviseRequests.clear();
    }

    /** The JSON bodies the API sent to /analyze and /revise. */
    public List<String> analyzeRequests() {
        return new ArrayList<>(analyzeRequests);
    }

    public List<String> reviseRequests() {
        return new ArrayList<>(reviseRequests);
    }

    public static String sampleResume() {
        return readResource("/ai/sample-resume.txt");
    }

    private void handle(HttpExchange exchange, boolean analyze) throws IOException {
        String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        (analyze ? analyzeRequests : reviseRequests).add(request);
        // uvicorn cannot upgrade to HTTP/2 on a plain connection. A client that tries gets this,
        // so a regression to the JDK default (an h2c upgrade) fails the tests instead of production.
        if (exchange.getRequestHeaders().containsKey("Upgrade")) {
            respond(exchange, 426, "{\"detail\":\"HTTP/1.1 only\"}");
            return;
        }
        switch (mode) {
            case DROP -> exchange.close();
            case SLOW -> {
                sleep(1_500);
                respond(exchange, 200, analyze ? analyzeResponse : reviseResponse(request));
            }
            case ERROR_500 -> respond(exchange, 500, "{\"detail\":\"The analysis could not be completed.\"}");
            case GARBAGE -> respond(exchange, 200, "<html>not json</html>");
            case REJECT -> {
                if (analyze) {
                    respond(exchange, 200, analyzeResponse);
                } else {
                    respond(exchange, 422, "{\"detail\":[{\"type\":\"invalid_edit\"}]}");
                }
            }
            case OK -> respond(exchange, 200, analyze ? analyzeResponse : reviseResponse(request));
        }
    }

    /**
     * Applies the edits to the canned analysis: found skills minus the removed ones, plus the
     * confirmed possible matches, plus the added skills. The score is 10 per skill (at most 100)
     * and the single suggestion names the number of skills, so tests can see the edit applied.
     */
    private String reviseResponse(String request) {
        JsonNode body = MAPPER.readTree(request);
        List<String> removed = strings(body.get("removed_skill_ids"));
        List<String> confirmed = strings(body.get("confirmed_skill_ids"));
        List<String> added = strings(body.get("added_skill_ids"));

        Map<String, ObjectNode> effective = new LinkedHashMap<>();
        for (JsonNode skill : analysis.get("skills")) {
            String id = skill.get("id").asString();
            boolean detected = "detected".equals(skill.get("status").asString());
            boolean keep = detected ? !removed.contains(id) : confirmed.contains(id);
            if (keep) {
                effective.put(id, skillNode(skill, detected ? "detected" : "confirmed"));
            }
        }
        for (String id : added) {
            ObjectNode node = MAPPER.createObjectNode();
            node.put("id", id).put("name", id).put("category", "Added").put("strength", 0.5)
                    .put("grade", "listed").put("source", "added");
            effective.put(id, node);
        }

        ArrayNode roles = MAPPER.createArrayNode();
        List<String> targets = strings(body.get("target_roles"));
        if (targets.isEmpty()) {
            targets.add("backend-developer");
        }
        double score = Math.min(100.0, effective.size() * 10.0);
        for (String slug : targets) {
            ObjectNode role = roles.addObject();
            role.put("role_id", slug).put("name", slug).put("score", score).put("earned", score).put("maximum", 100.0);
            role.putArray("by_importance").addObject().put("importance", "core").put("weight", 3)
                    .put("matched", effective.size()).put("partial", 0).put("possible", 0).put("missing", 0)
                    .put("earned", score).put("maximum", 100.0);
            ArrayNode items = role.putArray("items");
            for (ObjectNode skill : effective.values()) {
                double strength = skill.get("strength").asDouble();
                items.addObject().put("skill_id", skill.get("id").asString()).put("name", skill.get("name").asString())
                        .put("importance", "core").put("weight", 3).put("status", strength >= 1.0 ? "matched" : "partial")
                        .put("strength", strength).put("points", 3 * strength);
            }
        }

        ObjectNode out = MAPPER.createObjectNode();
        ArrayNode skills = out.putArray("skills");
        effective.values().forEach(skills::add);
        out.set("roles", roles);
        ObjectNode suggestion = out.putArray("suggestions").addObject();
        suggestion.put("id", "stub-edited").put("kind", "evidence").put("priority", "medium")
                .put("message", "Stub suggestion for " + effective.size() + " skills")
                .put("reason", "Rebuilt after your edits").putArray("skills");
        return out.toString();
    }

    private static ObjectNode skillNode(JsonNode skill, String source) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("id", skill.get("id").asString()).put("name", skill.get("name").asString())
                .put("category", skill.get("category").asString()).put("strength", skill.get("strength").asDouble())
                .put("grade", skill.get("grade").asString()).put("source", source);
        return node;
    }

    private static List<String> strings(JsonNode array) {
        List<String> out = new ArrayList<>();
        if (array != null) {
            array.forEach(n -> out.add(n.asString()));
        }
        return out;
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String readResource(String path) {
        try (InputStream in = AiStub.class.getResourceAsStream(path)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
