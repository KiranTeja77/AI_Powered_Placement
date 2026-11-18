package com.placewise.api.admin;

import com.placewise.api.user.Role;
import com.placewise.api.user.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/** Request and response bodies for the admin user endpoints. */
public final class AdminDtos {

    private AdminDtos() {}

    public record DepartmentRef(UUID id, String code, String name) {}

    /** One account in the admin's list. Never carries anything secret. */
    public record AdminUserRow(
            UUID id,
            String email,
            String fullName,
            Role role,
            UserStatus status,
            DepartmentRef department,
            String rollNo,
            Instant lastLoginAt,
            Instant createdAt) {}

    /** Staff accounts only: students register themselves. There is no password field on purpose. */
    public record CreateUserRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull Role role,
            UUID departmentId) {}

    public record UpdateStatusRequest(@NotNull UserStatus status) {}
}
