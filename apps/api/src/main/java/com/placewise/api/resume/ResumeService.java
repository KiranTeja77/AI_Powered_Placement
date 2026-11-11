package com.placewise.api.resume;

import com.placewise.api.common.ApiException;
import com.placewise.api.resume.AiServiceClient.AiUnavailableException;
import com.placewise.api.resume.AiServiceClient.SkillStrength;
import com.placewise.api.resume.AnalysisResult.AnalysisSkill;
import com.placewise.api.resume.AnalysisResult.RoleReadiness;
import com.placewise.api.resume.ResumeAnalysisRepository.SummaryRow;
import com.placewise.api.resume.ResumeDtos.AnalysisDetail;
import com.placewise.api.resume.ResumeDtos.AnalysisSummary;
import com.placewise.api.resume.ResumeDtos.AnalyzeRequest;
import com.placewise.api.resume.ResumeDtos.EffectiveAnalysis;
import com.placewise.api.resume.ResumeDtos.EffectiveSkill;
import com.placewise.api.resume.ResumeDtos.PageResponse;
import com.placewise.api.resume.ResumeDtos.SkillEdits;
import com.placewise.api.resume.ResumeDtos.StoredEdits;
import com.placewise.api.resume.ResumeDtos.TargetRole;
import com.placewise.api.resume.ResumeDtos.UpdateSkillsRequest;
import com.placewise.api.role.CatalogueDtos.RoleResponse;
import com.placewise.api.role.CatalogueDtos.SkillResponse;
import com.placewise.api.role.CatalogueService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Analyses a student's resume, stores the result and lets the student correct the skill list.
 *
 * <p>The analyzer is called with no database transaction open, so a slow analyzer never holds a
 * connection. The resume text is passed through and stored but never logged.
 */
@Service
class ResumeService {

    static final int MIN_TEXT_CHARS = 200;
    private static final String SOURCE_DETECTED = "detected";
    private static final String SOURCE_CONFIRMED = "confirmed";
    private static final String SOURCE_ADDED = "added";
    /** A skill the student adds by hand has no evidence in the text, so it counts as listed. */
    private static final double ADDED_STRENGTH = 0.5;

    private final ResumeAnalysisRepository repository;
    private final AiServiceClient ai;
    private final CatalogueService catalogue;
    private final JsonMapper json;
    private final Clock clock;

    ResumeService(ResumeAnalysisRepository repository, AiServiceClient ai, CatalogueService catalogue,
            JsonMapper json, Clock clock) {
        this.repository = repository;
        this.ai = ai;
        this.catalogue = catalogue;
        this.json = json;
        this.clock = clock;
    }

    AnalysisDetail analyze(UUID studentId, AnalyzeRequest request) {
        String text = request.text();
        if (text.strip().length() < MIN_TEXT_CHARS) {
            throw ApiException.invalid("Some fields are not valid.",
                    Map.of("text", "Use at least " + MIN_TEXT_CHARS + " characters"));
        }
        List<String> roles = distinct(request.targetRoles());
        List<String> unknown = roles.stream().filter(r -> !catalogue.get().rolesBySlug().containsKey(r)).toList();
        if (!unknown.isEmpty()) {
            throw ApiException.invalid("Some fields are not valid.",
                    Map.of("targetRoles", "Unknown role: " + String.join(", ", unknown)));
        }

        AnalysisResult result = whileAvailable(() -> ai.analyze(text, roles));

        Instant now = clock.instant();
        ResumeAnalysis saved = repository.save(new ResumeAnalysis(studentId, text, write(roles), write(result),
                result.engineVersion(), summarize(result.roles(), effectiveFromResult(result).size()), now));
        return detail(saved);
    }

    PageResponse<AnalysisSummary> list(UUID studentId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(50, size));
        Page<SummaryRow> rows = repository.findSummaries(studentId, PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        List<AnalysisSummary> items = rows.getContent().stream().map(this::summary).toList();
        return new PageResponse<>(items, rows.getNumber(), rows.getSize(), rows.getTotalElements(), rows.getTotalPages());
    }

    AnalysisDetail get(UUID studentId, UUID id) {
        return detail(owned(studentId, id));
    }

    AnalysisDetail updateSkills(UUID studentId, UUID id, UpdateSkillsRequest request) {
        ResumeAnalysis analysis = owned(studentId, id);
        AnalysisResult result = read(analysis.getResult(), AnalysisResult.class);
        List<String> targetRoles = readRoles(analysis);

        Map<String, AnalysisSkill> found = new LinkedHashMap<>();
        result.skills().forEach(s -> found.put(s.id(), s));
        List<String> confirmed = distinct(request.confirmedSkillIds());
        List<String> removed = distinct(request.removedSkillIds());
        List<String> added = distinct(request.addedSkillIds());
        validateEdits(found, confirmed, removed, added);

        Instant now = clock.instant();
        if (confirmed.isEmpty() && removed.isEmpty() && added.isEmpty()) {
            // No edits: back to the analyzer's own answer.
            analysis.applyEdits(null, summarize(result.roles(), effectiveFromResult(result).size()), now);
            return detail(repository.save(analysis));
        }

        List<EffectiveSkill> effective = effectiveSkills(found, confirmed, removed, added);
        List<SkillStrength> strengths = effective.stream().map(s -> new SkillStrength(s.id(), s.strength())).toList();
        List<RoleReadiness> roles = whileAvailable(() -> ai.compare(strengths, targetRoles));

        StoredEdits stored = new StoredEdits(confirmed, removed, added, effective, roles, now.toString());
        analysis.applyEdits(write(stored), summarize(roles, effective.size()), now);
        return detail(repository.save(analysis));
    }

    // ------------------------------------------------------------------ editing rules

    private void validateEdits(Map<String, AnalysisSkill> found, List<String> confirmed, List<String> removed,
            List<String> added) {
        Map<String, String> errors = new LinkedHashMap<>();
        List<String> notPossible = confirmed.stream()
                .filter(s -> !found.containsKey(s) || !"possible".equals(found.get(s).status())).toList();
        if (!notPossible.isEmpty()) {
            errors.put("confirmedSkillIds", "Only possible matches can be confirmed: " + String.join(", ", notPossible));
        }
        List<String> notDetected = removed.stream()
                .filter(s -> !found.containsKey(s) || !"detected".equals(found.get(s).status())).toList();
        if (!notDetected.isEmpty()) {
            errors.put("removedSkillIds", "Only skills found in the resume can be removed: " + String.join(", ", notDetected));
        }
        List<String> invalidAdds = added.stream()
                .filter(s -> !catalogue.get().skillsBySlug().containsKey(s) || found.containsKey(s)).toList();
        if (!invalidAdds.isEmpty()) {
            errors.put("addedSkillIds",
                    "Unknown skill, or already found in the resume: " + String.join(", ", invalidAdds));
        }
        if (!errors.isEmpty()) {
            throw ApiException.invalid("Some fields are not valid.", errors);
        }
    }

    /** Skills found and not removed, plus confirmed possible matches, plus skills added by hand. */
    private List<EffectiveSkill> effectiveSkills(Map<String, AnalysisSkill> found, List<String> confirmed,
            List<String> removed, List<String> added) {
        List<EffectiveSkill> out = new ArrayList<>();
        for (AnalysisSkill skill : found.values()) {
            if ("detected".equals(skill.status()) && !removed.contains(skill.id())) {
                out.add(effective(skill, SOURCE_DETECTED));
            }
        }
        for (String id : confirmed) {
            out.add(effective(found.get(id), SOURCE_CONFIRMED));
        }
        for (String id : added) {
            SkillResponse skill = catalogue.get().skillsBySlug().get(id);
            out.add(new EffectiveSkill(skill.slug(), skill.name(), skill.category(), ADDED_STRENGTH, "listed", SOURCE_ADDED));
        }
        return out;
    }

    private static EffectiveSkill effective(AnalysisSkill skill, String source) {
        return new EffectiveSkill(skill.id(), skill.name(), skill.category(), skill.strength(), skill.grade(), source);
    }

    private static List<EffectiveSkill> effectiveFromResult(AnalysisResult result) {
        return result.skills().stream()
                .filter(s -> "detected".equals(s.status()))
                .map(s -> effective(s, SOURCE_DETECTED))
                .toList();
    }

    // ------------------------------------------------------------------ mapping

    private AnalysisDetail detail(ResumeAnalysis analysis) {
        AnalysisResult result = read(analysis.getResult(), AnalysisResult.class);
        StoredEdits stored = analysis.getConfirmedSkills() == null
                ? null : read(analysis.getConfirmedSkills(), StoredEdits.class);
        EffectiveAnalysis effective = stored == null
                ? new EffectiveAnalysis(effectiveFromResult(result), result.roles())
                : new EffectiveAnalysis(stored.skills(), stored.roles());
        SkillEdits edits = stored == null ? null : new SkillEdits(stored.confirmedSkillIds(),
                stored.removedSkillIds(), stored.addedSkillIds(), Instant.parse(stored.updatedAt()));
        return new AnalysisDetail(analysis.getId(), analysis.getCreatedAt(), analysis.getUpdatedAt(),
                targetRoles(readRoles(analysis)), result, edits, effective);
    }

    private AnalysisSummary summary(SummaryRow row) {
        RoleResponse top = row.topRole() == null ? null : catalogue.get().rolesBySlug().get(row.topRole());
        return new AnalysisSummary(row.id(), row.createdAt(),
                targetRoles(read(row.targetRoles(), new TypeReference<List<String>>() {})),
                top == null ? null : new TargetRole(top.slug(), top.name()),
                row.topScore() == null ? null : row.topScore().doubleValue(),
                row.skillCount(), row.edited(), row.engineVersion());
    }

    private List<TargetRole> targetRoles(List<String> slugs) {
        return slugs.stream().map(slug -> {
            RoleResponse role = catalogue.get().rolesBySlug().get(slug);
            return new TargetRole(slug, role == null ? slug : role.name());
        }).toList();
    }

    /** The best readiness among the roles in the answer, kept on the row for the history list. */
    private static ResumeAnalysis.Summary summarize(List<RoleReadiness> roles, int skillCount) {
        return roles.stream().max(Comparator.comparingDouble(RoleReadiness::score))
                .map(r -> new ResumeAnalysis.Summary(r.roleId(),
                        BigDecimal.valueOf(r.score()).setScale(1, RoundingMode.HALF_UP), skillCount))
                .orElse(new ResumeAnalysis.Summary(null, null, skillCount));
    }

    // ------------------------------------------------------------------ helpers

    private ResumeAnalysis owned(UUID studentId, UUID id) {
        ResumeAnalysis analysis = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("This analysis does not exist."));
        if (!studentId.equals(analysis.getStudentId())) {
            throw ApiException.forbidden("forbidden", "You do not have access to this analysis.");
        }
        return analysis;
    }

    private static List<String> distinct(List<String> values) {
        return values == null ? List.of() : List.copyOf(new LinkedHashSet<>(values));
    }

    private List<String> readRoles(ResumeAnalysis analysis) {
        return read(analysis.getTargetRoles(), new TypeReference<List<String>>() {});
    }

    private <T> T whileAvailable(Supplier<T> call) {
        try {
            return call.get();
        } catch (AiUnavailableException e) {
            throw ApiException.unavailable("analysis_unavailable",
                    "Resume analysis is temporarily unavailable.", 30);
        }
    }

    private String write(Object value) {
        return json.writeValueAsString(value);
    }

    private <T> T read(String value, Class<T> type) {
        return json.readValue(value, type);
    }

    private <T> T read(String value, TypeReference<T> type) {
        return json.readValue(value, type);
    }
}
