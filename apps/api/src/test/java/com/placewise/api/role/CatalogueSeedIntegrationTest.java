package com.placewise.api.role;

import static org.assertj.core.api.Assertions.assertThat;

import com.placewise.api.support.IntegrationTestBase;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** The API's catalogue must be exactly what the AI service's JSON files say. */
class CatalogueSeedIntegrationTest extends IntegrationTestBase {

    private static final Path DATA = Path.of("..", "ai-service", "data");
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static JsonNode read(String file) throws Exception {
        return MAPPER.readTree(Files.readString(DATA.resolve(file)));
    }

    @Test
    void everySkillInTheTaxonomyIsInTheDatabaseWithItsNameAndCategory() throws Exception {
        JsonNode taxonomy = read("skills_taxonomy.json");
        Map<String, List<String>> rows = new java.util.HashMap<>();
        jdbc.query("select slug, name, category from skill", rs -> {
            rows.put(rs.getString("slug"), List.of(rs.getString("name"), rs.getString("category")));
        });

        assertThat(rows).hasSize(taxonomy.get("skills").size());
        assertThat(rows.size()).isGreaterThan(400);
        for (JsonNode skill : taxonomy.get("skills")) {
            assertThat(rows.get(skill.get("id").asString()))
                    .containsExactly(skill.get("name").asString(), skill.get("category").asString());
        }
    }

    @Test
    void everyRoleAndItsSkillsWithImportanceMatchTheRolesFile() throws Exception {
        JsonNode roles = read("roles.json").get("roles");
        assertThat(jdbc.queryForObject("select count(*) from job_role", Integer.class)).isEqualTo(roles.size());
        assertThat(roles.size()).isEqualTo(14);

        for (JsonNode role : roles) {
            Set<String> expected = new HashSet<>();
            for (JsonNode entry : role.get("skills")) {
                expected.add(entry.get("skill").asString() + ":" + entry.get("importance").asString());
            }
            List<String> actual = jdbc.queryForList(
                    "select s.slug || ':' || rs.importance from role_skill rs "
                            + "join job_role r on r.id = rs.role_id join skill s on s.id = rs.skill_id "
                            + "where r.slug = ?",
                    String.class, role.get("id").asString());
            assertThat(actual).containsExactlyInAnyOrderElementsOf(expected);
        }
    }

    @Test
    void roleDetailsAreStored() throws Exception {
        JsonNode first = read("roles.json").get("roles").get(0);
        Map<String, Object> row = jdbc.queryForMap(
                "select name, summary, branches::text as branches from job_role where slug = ?",
                first.get("id").asString());
        assertThat(row.get("name")).isEqualTo(first.get("name").asString());
        assertThat(row.get("summary")).isEqualTo(first.get("summary").asString());
        assertThat(MAPPER.readTree((String) row.get("branches"))).isEqualTo(first.get("branches"));
    }

    @Test
    void theSeedRanOnceAsARepeatableMigration() {
        Integer runs = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where description = 'SeedCatalogue' and success", Integer.class);
        assertThat(runs).isEqualTo(1);
        Integer checksum = jdbc.queryForObject(
                "select checksum from flyway_schema_history where description = 'SeedCatalogue'", Integer.class);
        assertThat(checksum).isNotNull();
    }

    @Test
    void theNewTablesExistWithTheirIndexes() {
        List<String> indexes = jdbc.queryForList(
                "select indexname from pg_indexes where tablename in ('resume_analysis', 'role_skill', 'career_interest')",
                String.class);
        assertThat(indexes).contains("ix_resume_analysis_student_created", "ix_resume_analysis_result",
                "uq_role_skill", "uq_career_interest");
        String gin = jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'ix_resume_analysis_result'", String.class);
        assertThat(gin).containsIgnoringCase("gin");
    }
}
