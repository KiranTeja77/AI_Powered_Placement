package db.migration;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Fills skill, job_role and role_skill from the AI service's own data files, which the build copies
 * onto the classpath under /catalogue. This is a repeatable migration whose checksum is computed
 * from those files: edit a file and the next start re-runs this and brings the database in line, so
 * the analyzer and the API can never disagree about which skills and roles exist.
 */
public class R__SeedCatalogue extends BaseJavaMigration {

    static final String TAXONOMY = "/catalogue/skills_taxonomy.json";
    static final String ROLES = "/catalogue/roles.json";

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Override
    public Integer getChecksum() {
        CRC32 crc = new CRC32();
        crc.update(read(TAXONOMY));
        crc.update(read(ROLES));
        return (int) crc.getValue();
    }

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        JsonNode taxonomy = MAPPER.readTree(read(TAXONOMY));
        JsonNode roles = MAPPER.readTree(read(ROLES));

        List<String> skillSlugs = new ArrayList<>();
        try (PreparedStatement upsert = connection.prepareStatement(
                "INSERT INTO skill (slug, name, category) VALUES (?, ?, ?) "
                        + "ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category")) {
            for (JsonNode skill : taxonomy.get("skills")) {
                skillSlugs.add(skill.get("id").asString());
                upsert.setString(1, skill.get("id").asString());
                upsert.setString(2, skill.get("name").asString());
                upsert.setString(3, skill.get("category").asString());
                upsert.addBatch();
            }
            upsert.executeBatch();
        }
        deleteMissing(connection, "skill", skillSlugs);

        List<String> roleSlugs = new ArrayList<>();
        try (PreparedStatement upsert = connection.prepareStatement(
                "INSERT INTO job_role (slug, name, summary, branches) VALUES (?, ?, ?, ?::jsonb) "
                        + "ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, "
                        + "summary = EXCLUDED.summary, branches = EXCLUDED.branches")) {
            for (JsonNode role : roles.get("roles")) {
                roleSlugs.add(role.get("id").asString());
                upsert.setString(1, role.get("id").asString());
                upsert.setString(2, role.get("name").asString());
                upsert.setString(3, role.get("summary").asString());
                upsert.setString(4, role.get("branches").toString());
                upsert.addBatch();
            }
            upsert.executeBatch();
        }
        deleteMissing(connection, "job_role", roleSlugs);

        // A role's skill list is replaced as a whole: it is small and nothing else points at it.
        try (PreparedStatement clear = connection.prepareStatement("DELETE FROM role_skill");
                PreparedStatement insert = connection.prepareStatement(
                        "INSERT INTO role_skill (role_id, skill_id, importance) "
                                + "SELECT r.id, s.id, ? FROM job_role r, skill s WHERE r.slug = ? AND s.slug = ?")) {
            clear.executeUpdate();
            for (JsonNode role : roles.get("roles")) {
                for (JsonNode entry : role.get("skills")) {
                    insert.setString(1, entry.get("importance").asString());
                    insert.setString(2, role.get("id").asString());
                    insert.setString(3, entry.get("skill").asString());
                    insert.addBatch();
                }
            }
            int[] results = insert.executeBatch();
            for (int result : results) {
                if (result != 1 && result != java.sql.Statement.SUCCESS_NO_INFO) {
                    throw new IllegalStateException("A role refers to a skill that is not in the taxonomy");
                }
            }
        }
    }

    /** Removes catalogue rows that are no longer in the data files. */
    private static void deleteMissing(Connection connection, String table, List<String> keep) throws Exception {
        Array slugs = connection.createArrayOf("text", keep.toArray());
        try (PreparedStatement delete = connection.prepareStatement(
                "DELETE FROM " + table + " WHERE slug <> ALL (?)")) {
            delete.setArray(1, slugs);
            delete.executeUpdate();
        } finally {
            slugs.free();
        }
    }

    private static byte[] read(String resource) {
        try (InputStream in = R__SeedCatalogue.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException(resource + " is missing; the build copies it from apps/ai-service/data");
            }
            return in.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + resource, e);
        }
    }
}
