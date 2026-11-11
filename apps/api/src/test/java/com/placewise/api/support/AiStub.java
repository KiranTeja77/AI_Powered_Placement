package com.placewise.api.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * A stand-in for the resume-analysis service: a real HTTP server on a random port, so timeouts,
 * dropped connections and error statuses behave as they would against the real thing.
 *
 * <p>/analyze answers with a response generated once by the real analyzer for sample-resume.txt.
 * /compare builds a small deterministic answer from the skills it is given.
 */
public final class AiStub implements AutoCloseable {

    public enum Mode { OK, SLOW, ERROR_500, DROP, GARBAGE }

    /** One server for the whole test JVM; tests call {@link #reset()} before they run. */
    public static final AiStub SHARED = new AiStub();

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final HttpServer server;
    private final String analyzeResponse;
    private volatile Mode mode = Mode.OK;
    private final List<String> analyzeRequests = new CopyOnWriteArrayList<>();
    private final List<String> compareRequests = new CopyOnWriteArrayList<>();

    public AiStub() {
        try {
            analyzeResponse = readResource("/ai/analyze-backend.json");
            server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            server.createContext("/analyze", exchange -> handle(exchange, true));
            server.createContext("/compare", exchange -> handle(exchange, false));
            // Several requests at once: a deliberately slow one must not block the next test's.
            server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
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
        compareRequests.clear();
    }

    /** The JSON bodies the API sent to /analyze and /compare. */
    public List<String> analyzeRequests() {
        return new ArrayList<>(analyzeRequests);
    }

    public List<String> compareRequests() {
        return new ArrayList<>(compareRequests);
    }

    public static String sampleResume() {
        return readResource("/ai/sample-resume.txt");
    }

    private void handle(HttpExchange exchange, boolean analyze) throws IOException {
        String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        (analyze ? analyzeRequests : compareRequests).add(request);
        switch (mode) {
            case DROP -> exchange.close();
            case SLOW -> {
                sleep(1_500);
                respond(exchange, 200, analyze ? analyzeResponse : compareResponse(request));
            }
            case ERROR_500 -> respond(exchange, 500, "{\"detail\":\"The analysis could not be completed.\"}");
            case GARBAGE -> respond(exchange, 200, "<html>not json</html>");
            case OK -> respond(exchange, 200, analyze ? analyzeResponse : compareResponse(request));
        }
    }

    /** Roles with score = 10 per skill given (capped), so a test can tell the edit was applied. */
    private static String compareResponse(String request) {
        JsonNode body = MAPPER.readTree(request);
        ArrayNode roles = MAPPER.createArrayNode();
        List<String> targets = new ArrayList<>();
        body.get("target_roles").forEach(n -> targets.add(n.asString()));
        if (targets.isEmpty()) {
            targets.add("backend-developer");
        }
        int skills = body.get("skills").size();
        double score = Math.min(100.0, skills * 10.0);
        for (String slug : targets) {
            ObjectNode role = roles.addObject();
            role.put("role_id", slug).put("name", slug).put("score", score).put("earned", score).put("maximum", 100.0);
            ArrayNode breakdown = role.putArray("by_importance");
            breakdown.addObject().put("importance", "core").put("weight", 3).put("matched", skills)
                    .put("partial", 0).put("possible", 0).put("missing", 0).put("earned", score).put("maximum", 100.0);
            ArrayNode items = role.putArray("items");
            for (JsonNode skill : body.get("skills")) {
                double strength = skill.get("strength").asDouble();
                items.addObject().put("skill_id", skill.get("skill_id").asString()).put("name", skill.get("skill_id").asString())
                        .put("importance", "core").put("weight", 3).put("status", strength >= 1.0 ? "matched" : "partial")
                        .put("strength", strength).put("points", 3 * strength);
            }
        }
        ObjectNode out = MAPPER.createObjectNode();
        out.put("engine_version", "stub").put("taxonomy_version", "stub");
        out.set("roles", roles);
        return out.toString();
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
