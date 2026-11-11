package com.placewise.api.student;

import com.placewise.api.common.ApiException;
import com.placewise.api.role.CatalogueService;
import com.placewise.api.student.CareerInterestDtos.CareerInterestsResponse;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The roles a student has marked as interests. Stored in career_interest, one row per role. */
@Service
class CareerInterestService {

    private final JdbcClient jdbc;
    private final CatalogueService catalogue;

    CareerInterestService(JdbcClient jdbc, CatalogueService catalogue) {
        this.jdbc = jdbc;
        this.catalogue = catalogue;
    }

    @Transactional(readOnly = true)
    CareerInterestsResponse get(UUID studentId) {
        return new CareerInterestsResponse(slugs(studentId));
    }

    /** Makes the saved set equal to the given one: adds what is new and removes what is not listed. */
    @Transactional
    CareerInterestsResponse replace(UUID studentId, List<String> requested) {
        List<String> wanted = List.copyOf(new LinkedHashSet<>(requested));
        List<String> unknown = wanted.stream().filter(s -> !catalogue.get().rolesBySlug().containsKey(s)).toList();
        if (!unknown.isEmpty()) {
            throw ApiException.invalid("Some fields are not valid.",
                    Map.of("roleSlugs", "Unknown role: " + String.join(", ", unknown)));
        }

        jdbc.sql("delete from career_interest ci using job_role r "
                        + "where ci.role_id = r.id and ci.student_id = :student and r.slug <> all (:slugs)")
                .param("student", studentId)
                .param("slugs", wanted.toArray(new String[0]))
                .update();
        for (String slug : wanted) {
            jdbc.sql("insert into career_interest (student_id, role_id) "
                            + "select :student, id from job_role where slug = :slug on conflict do nothing")
                    .param("student", studentId)
                    .param("slug", slug)
                    .update();
        }
        return new CareerInterestsResponse(slugs(studentId));
    }

    private List<String> slugs(UUID studentId) {
        return jdbc.sql("select r.slug from career_interest ci join job_role r on r.id = ci.role_id "
                        + "where ci.student_id = :student order by r.name")
                .param("student", studentId)
                .query(String.class)
                .list();
    }
}
