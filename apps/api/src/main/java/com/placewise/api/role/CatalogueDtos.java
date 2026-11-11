package com.placewise.api.role;

import java.util.List;

/** Read-only views of the skill and role catalogue. */
public final class CatalogueDtos {

    private CatalogueDtos() {}

    public record SkillResponse(String slug, String name, String category) {}

    /** A skill a role expects, and how much it matters (core, important or bonus). */
    public record RoleSkillResponse(String slug, String name, String category, String importance) {}

    public record RoleResponse(
            String slug, String name, String summary, List<String> branches, List<RoleSkillResponse> skills) {}
}
