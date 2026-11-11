package com.placewise.api.resume;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

/**
 * One analysis of one student's resume. The large JSON documents are kept as JSON text and read
 * and written by {@link ResumeService}; the summary columns exist so the history list never has to
 * load them.
 */
@Entity
@Table(name = "resume_analysis")
class ResumeAnalysis {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "student_id", updatable = false)
    private UUID studentId;

    @Column(name = "raw_text", updatable = false)
    private String rawText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_roles", columnDefinition = "jsonb", updatable = false)
    private String targetRoles;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", updatable = false)
    private String result;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "confirmed_skills", columnDefinition = "jsonb")
    private String confirmedSkills;

    @Column(name = "engine_version", updatable = false)
    private String engineVersion;

    @Column(name = "top_role")
    private String topRole;

    @Column(name = "top_score", precision = 5, scale = 1)
    private BigDecimal topScore;

    @Column(name = "skill_count")
    private int skillCount;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected ResumeAnalysis() {}

    ResumeAnalysis(UUID studentId, String rawText, String targetRoles, String result, String engineVersion,
            Summary summary, Instant now) {
        this.studentId = studentId;
        this.rawText = rawText;
        this.targetRoles = targetRoles;
        this.result = result;
        this.engineVersion = engineVersion;
        applySummary(summary);
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** The values the history list shows, recomputed whenever the effective skills change. */
    record Summary(String topRole, BigDecimal topScore, int skillCount) {}

    void applyEdits(String confirmedSkills, Summary summary, Instant now) {
        this.confirmedSkills = confirmedSkills;
        applySummary(summary);
        this.updatedAt = now;
    }

    private void applySummary(Summary summary) {
        this.topRole = summary.topRole();
        this.topScore = summary.topScore();
        this.skillCount = summary.skillCount();
    }

    UUID getId() {
        return id;
    }

    UUID getStudentId() {
        return studentId;
    }

    String getTargetRoles() {
        return targetRoles;
    }

    String getResult() {
        return result;
    }

    String getConfirmedSkills() {
        return confirmedSkills;
    }

    String getEngineVersion() {
        return engineVersion;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
