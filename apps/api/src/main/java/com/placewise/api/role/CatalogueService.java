package com.placewise.api.role;

import com.placewise.api.role.CatalogueDtos.RoleResponse;
import com.placewise.api.role.CatalogueDtos.RoleSkillResponse;
import com.placewise.api.role.CatalogueDtos.SkillResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * The skill and role catalogue, loaded once. It only changes when the data files change, which
 * happens through a migration at start-up, so a restart is the only refresh it needs.
 */
@Service
public class CatalogueService {

    /** An immutable snapshot of the whole catalogue. */
    public record Catalogue(
            List<RoleResponse> roles,
            List<SkillResponse> skills,
            Map<String, RoleResponse> rolesBySlug,
            Map<String, SkillResponse> skillsBySlug) {}

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private volatile Catalogue cached;

    CatalogueService(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public Catalogue get() {
        Catalogue snapshot = cached;
        if (snapshot == null) {
            synchronized (this) {
                if (cached == null) {
                    cached = load();
                }
                snapshot = cached;
            }
        }
        return snapshot;
    }

    private Catalogue load() {
        List<SkillResponse> skills = jdbc.sql("select slug, name, category from skill order by category, name")
                .query((rs, n) -> new SkillResponse(rs.getString("slug"), rs.getString("name"), rs.getString("category")))
                .list();
        Map<String, SkillResponse> skillsBySlug = new LinkedHashMap<>();
        skills.forEach(s -> skillsBySlug.put(s.slug(), s));

        Map<String, List<RoleSkillResponse>> skillsByRole = new LinkedHashMap<>();
        jdbc.sql("select r.slug as role_slug, s.slug, s.name, s.category, rs.importance "
                        + "from role_skill rs join job_role r on r.id = rs.role_id join skill s on s.id = rs.skill_id "
                        + "order by r.name, case rs.importance when 'core' then 0 when 'important' then 1 else 2 end, s.name")
                .query(rs -> {
                    skillsByRole.computeIfAbsent(rs.getString("role_slug"), k -> new ArrayList<>())
                            .add(new RoleSkillResponse(rs.getString("slug"), rs.getString("name"),
                                    rs.getString("category"), rs.getString("importance")));
                });

        List<RoleResponse> roles = jdbc.sql("select slug, name, summary, branches::text as branches from job_role order by name")
                .query((rs, n) -> new RoleResponse(
                        rs.getString("slug"),
                        rs.getString("name"),
                        rs.getString("summary"),
                        json.readValue(rs.getString("branches"), new TypeReference<List<String>>() {}),
                        List.copyOf(skillsByRole.getOrDefault(rs.getString("slug"), List.of()))))
                .list();
        Map<String, RoleResponse> rolesBySlug = new LinkedHashMap<>();
        roles.forEach(r -> rolesBySlug.put(r.slug(), r));
        return new Catalogue(List.copyOf(roles), List.copyOf(skills), Map.copyOf(rolesBySlug), Map.copyOf(skillsBySlug));
    }
}
