package com.placewise.api.admin;

import com.placewise.api.admin.AdminDtos.AdminUserRow;
import com.placewise.api.admin.AdminDtos.CreateUserRequest;
import com.placewise.api.admin.AdminDtos.UpdateStatusRequest;
import com.placewise.api.common.PageResponse;
import com.placewise.api.user.Role;
import com.placewise.api.user.UserStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

/** Account administration. The security configuration restricts the whole path to admins. */
@RestController
@RequestMapping("/api/v1/admin/users")
class AdminUserController {

    private final AdminUserService service;

    AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    PageResponse<AdminUserRow> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(name = "q", required = false) String search) {
        return service.list(page, size, role, departmentId, status, search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AdminUserRow create(@Valid @RequestBody CreateUserRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}/status")
    AdminUserRow setStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        return service.setStatus(UUID.fromString(jwt.getSubject()), id, request.status());
    }
}
