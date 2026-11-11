package com.placewise.api.resume;

import java.util.List;

/**
 * What the analyzer returns for one resume, as the API serves and stores it.
 *
 * <p>Positions (start, end, snippetStart) are character offsets into the text the student
 * submitted. Skills are never reported without evidence: every one has at least one entry in
 * {@code evidence} pointing at the words it came from.
 */
public record AnalysisResult(
        String engineVersion,
        String taxonomyVersion,
        int textLength,
        List<AnalysisSection> sections,
        AnalysisFields fields,
        List<AnalysisSkill> skills,
        List<RoleReadiness> roles,
        List<AnalysisSuggestion> suggestions) {

    public record AnalysisSection(String name, String heading, int start, int end) {}

    public record AnalysisSpan(int start, int end, String text) {}

    public record AnalysisLink(String kind, int start, int end, String text) {}

    public record AnalysisEducation(String degree, int start, int end, String line) {}

    public record AnalysisCgpa(String kind, double value, double scale, int start, int end, String text) {}

    public record AnalysisFields(
            List<AnalysisSpan> emails,
            List<AnalysisSpan> phones,
            List<AnalysisLink> links,
            List<AnalysisEducation> education,
            AnalysisCgpa cgpa,
            List<AnalysisSpan> projectTitles) {}

    /** One place a skill was found: resume[start:end] equals matchedText. */
    public record AnalysisEvidence(
            int start, int end, String matchedText, String section, String snippet, int snippetStart) {}

    /**
     * A skill found in the resume. status is "detected" or "possible" (a close spelling the student
     * should confirm; never scored). grade is "applied" (used in a project or job) or "listed".
     */
    public record AnalysisSkill(
            String id,
            String name,
            String category,
            String status,
            String grade,
            double strength,
            boolean countsTowardScore,
            int mentionCount,
            List<AnalysisEvidence> evidence,
            Double similarity) {}

    public record AnalysisBreakdown(
            String importance,
            int weight,
            int matched,
            int partial,
            int possible,
            int missing,
            double earned,
            double maximum) {}

    /** One skill a role needs and how the resume measures up. status: matched, partial, possible, missing. */
    public record AnalysisGapItem(
            String skillId,
            String name,
            String importance,
            int weight,
            String status,
            double strength,
            double points) {}

    /** Readiness for one role: score = earned / maximum x 100, always with its breakdown. */
    public record RoleReadiness(
            String roleId,
            String name,
            double score,
            double earned,
            double maximum,
            List<AnalysisBreakdown> byImportance,
            List<AnalysisGapItem> items) {}

    public record AnalysisSuggestion(
            String id, String kind, String priority, String message, String reason, List<String> skills) {}
}
