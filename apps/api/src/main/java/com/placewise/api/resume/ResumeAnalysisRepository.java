package com.placewise.api.resume;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, UUID> {

    /** One row of the history list: only the small columns, never the resume text or the results. */
    record SummaryRow(
            UUID id,
            Instant createdAt,
            String targetRoles,
            String topRole,
            BigDecimal topScore,
            int skillCount,
            boolean edited,
            String engineVersion) {}

    @Query(value = "select new com.placewise.api.resume.ResumeAnalysisRepository$SummaryRow("
            + "a.id, a.createdAt, a.targetRoles, a.topRole, a.topScore, a.skillCount, "
            + "case when a.confirmedSkills is null then false else true end, a.engineVersion) "
            + "from ResumeAnalysis a where a.studentId = :studentId",
            countQuery = "select count(a) from ResumeAnalysis a where a.studentId = :studentId")
    Page<SummaryRow> findSummaries(@Param("studentId") UUID studentId, Pageable pageable);
}
