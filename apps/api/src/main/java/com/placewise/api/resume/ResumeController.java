package com.placewise.api.resume;

import com.placewise.api.resume.ResumeDtos.AnalysisDetail;
import com.placewise.api.resume.ResumeDtos.AnalysisSummary;
import com.placewise.api.resume.ResumeDtos.AnalyzeRequest;
import com.placewise.api.resume.ResumeDtos.PageResponse;
import com.placewise.api.resume.ResumeDtos.UpdateSkillsRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Students analyse their own resume text and review their own past analyses. */
@RestController
@RequestMapping("/api/v1/resumes")
class ResumeController {

    private final ResumeService resumes;

    ResumeController(ResumeService resumes) {
        this.resumes = resumes;
    }

    @PostMapping("/analyze")
    @ResponseStatus(HttpStatus.CREATED)
    AnalysisDetail analyze(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AnalyzeRequest request) {
        return resumes.analyze(studentId(jwt), request);
    }

    /** The signed-in student's analyses, newest first. */
    @GetMapping("/analyses")
    PageResponse<AnalysisSummary> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return resumes.list(studentId(jwt), page, size);
    }

    @GetMapping("/analyses/{id}")
    AnalysisDetail get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return resumes.get(studentId(jwt), id);
    }

    /** Confirm possible matches, remove skills or add skills; the readiness is recomputed. */
    @PatchMapping("/analyses/{id}/skills")
    AnalysisDetail updateSkills(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody UpdateSkillsRequest request) {
        return resumes.updateSkills(studentId(jwt), id, request);
    }

    private static UUID studentId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
