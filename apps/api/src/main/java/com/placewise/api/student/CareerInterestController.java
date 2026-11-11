package com.placewise.api.student;

import com.placewise.api.student.CareerInterestDtos.CareerInterestsRequest;
import com.placewise.api.student.CareerInterestDtos.CareerInterestsResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A student's own career interests. Students only. */
@RestController
@RequestMapping("/api/v1/me/career-interests")
class CareerInterestController {

    private final CareerInterestService interests;

    CareerInterestController(CareerInterestService interests) {
        this.interests = interests;
    }

    @GetMapping
    CareerInterestsResponse get(@AuthenticationPrincipal Jwt jwt) {
        return interests.get(UUID.fromString(jwt.getSubject()));
    }

    @PutMapping
    CareerInterestsResponse replace(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CareerInterestsRequest request) {
        return interests.replace(UUID.fromString(jwt.getSubject()), request.roleSlugs());
    }
}
