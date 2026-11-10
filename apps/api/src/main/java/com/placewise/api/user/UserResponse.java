package com.placewise.api.user;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        Role role,
        UserStatus status,
        DepartmentResponse department,
        StudentProfile student) {

    public record DepartmentResponse(UUID id, String code, String name) {}

    public record StudentProfile(String rollNo, int graduationYear) {}
}
