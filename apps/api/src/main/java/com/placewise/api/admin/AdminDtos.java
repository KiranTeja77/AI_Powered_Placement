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
            /** An admin-created account whose owner has not chosen a password yet. */
            boolean invitePending,
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

    /** Account counts for the admin overview. */
    public record RoleCount(Role role, long total, long active) {}

    public record AdminOverview(
            long totalUsers,
            long activeUsers,
            long inactiveUsers,
            long pendingInvites,
            java.util.List<RoleCount> usersByRole) {}

    /** What each role may do, derived from the rules the API enforces. */
    public record PermissionMatrix(
            java.util.List<RoleRef> roles,
            java.util.List<PermissionRow> permissions,
            java.util.Map<String, java.util.List<String>> grants) {}

    public record RoleRef(String id, String label) {}

    /** {@code access} is "public", "signed_in" or "roles". */
    public record PermissionRow(String id, String label, String group, String access,
            java.util.List<String> endpoints) {}
}
