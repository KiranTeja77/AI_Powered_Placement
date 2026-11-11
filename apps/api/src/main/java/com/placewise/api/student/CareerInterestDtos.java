package com.placewise.api.student;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class CareerInterestDtos {

    private CareerInterestDtos() {}

    /** The roles a student is interested in, as role slugs. Sending a list replaces the saved one. */
    public record CareerInterestsRequest(
            @NotNull(message = "Send the list of role slugs")
            @Size(max = 14, message = "Choose up to 14 roles") List<String> roleSlugs) {}

    public record CareerInterestsResponse(List<String> roleSlugs) {}
}
