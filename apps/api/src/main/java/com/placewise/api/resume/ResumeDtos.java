package com.placewise.api.resume;

import com.placewise.api.resume.AnalysisResult.AnalysisSuggestion;
import com.placewise.api.resume.AnalysisResult.RoleReadiness;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Requests and responses of the resume endpoints. */
public final class ResumeDtos {

    private ResumeDtos() {}

    /**
     * The resume text (200 to 20,000 characters) and the role slugs to measure it against. With no
     * target roles every role is scored.
     */
    public record AnalyzeRequest(
            @NotNull(message = "Paste your resume text")
            @Size(max = 20_000, message = "Use 20,000 characters or fewer") String text,
            @Size(max = 14, message = "Choose up to 14 roles") List<String> targetRoles) {

        /** Never prints the resume: framework debug logging calls toString on request bodies. */
        @Override
        public String toString() {
            return "AnalyzeRequest[text=<" + (text == null ? 0 : text.length()) + " characters>, targetRoles="
                    + targetRoles + "]";
        }
    }

    /**
     * The student's edits, always relative to the analyzer's original answer (so sending the same
     * body twice gives the same result, and empty lists reset the analysis).
     */
    public record UpdateSkillsRequest(
            @NotNull @Size(max = 200) List<String> confirmedSkillIds,
            @NotNull @Size(max = 500) List<String> removedSkillIds,
            @NotNull @Size(max = 200) List<String> addedSkillIds) {}

    public record TargetRole(String slug, String name) {}

    /** A skill that counts toward the readiness scores, and where it came from. */
    public record EffectiveSkill(
            String id, String name, String category, double strength, String grade, String source) {}

    /**
     * The skills, role readiness and suggestions after the student's edits (or the analyzer's own,
     * if there are none).
     */
    public record EffectiveAnalysis(
            List<EffectiveSkill> skills, List<RoleReadiness> roles, List<AnalysisSuggestion> suggestions) {}

    public record SkillEdits(
            List<String> confirmedSkillIds,
            List<String> removedSkillIds,
            List<String> addedSkillIds,
            Instant updatedAt) {}

    public record AnalysisDetail(
            UUID id,
            Instant createdAt,
            Instant updatedAt,
            List<TargetRole> targetRoles,
            AnalysisResult result,
            SkillEdits edits,
            EffectiveAnalysis effective) {

        /** Evidence snippets and contact details come from the resume, so they are not printed. */
        @Override
        public String toString() {
            return "AnalysisDetail[id=" + id + "]";
        }
    }

    /** One row of the history list. topScore is the best readiness among the roles of the analysis. */
    public record AnalysisSummary(
            UUID id,
            Instant createdAt,
            List<TargetRole> targetRoles,
            TargetRole topRole,
            Double topScore,
            int skillCount,
            boolean edited,
            String engineVersion) {}

    public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}

    /** What is stored in resume_analysis.confirmed_skills. */
    record StoredEdits(
            List<String> confirmedSkillIds,
            List<String> removedSkillIds,
            List<String> addedSkillIds,
            List<EffectiveSkill> skills,
            List<RoleReadiness> roles,
            List<AnalysisSuggestion> suggestions,
            String updatedAt) {}
}
