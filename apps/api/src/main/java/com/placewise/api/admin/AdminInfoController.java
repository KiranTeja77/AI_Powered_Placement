package com.placewise.api.admin;

import com.placewise.api.admin.AdminDtos.AdminOverview;
import com.placewise.api.admin.AdminDtos.PermissionMatrix;
import com.placewise.api.admin.AdminDtos.PermissionRow;
import com.placewise.api.admin.AdminDtos.RoleRef;
import com.placewise.api.common.AccessRules;
import com.placewise.api.user.Role;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only information for the admin screens. Restricted to admins by the security rules. */
@RestController
@RequestMapping("/api/v1/admin")
class AdminInfoController {

    private static final Map<Role, String> LABELS = Map.of(
            Role.STUDENT, "Student",
            Role.FACULTY, "Faculty",
            Role.TP_HEAD, "T&P head",
            Role.RECRUITER, "Recruiter",
            Role.ADMIN, "Admin");

    private final AdminUserService users;

    AdminInfoController(AdminUserService users) {
        this.users = users;
    }

    @GetMapping("/overview")
    AdminOverview overview() {
        return users.overview();
    }

    /**
     * What each role may do. Built from {@link AccessRules}, the same list the security
     * configuration enforces, so it cannot drift from the real behaviour.
     */
    @GetMapping("/permissions")
    PermissionMatrix permissions() {
        List<RoleRef> roles = new ArrayList<>();
        for (Role role : List.of(Role.STUDENT, Role.FACULTY, Role.TP_HEAD, Role.RECRUITER, Role.ADMIN)) {
            roles.add(new RoleRef(role.name(), LABELS.get(role)));
        }
        List<PermissionRow> rows = new ArrayList<>();
        Map<String, List<String>> grants = new LinkedHashMap<>();
        for (AccessRules.Rule rule : AccessRules.RULES) {
            String access = switch (rule.access()) {
                case PUBLIC -> "public";
                case SIGNED_IN -> "signed_in";
                case ROLES -> "roles";
            };
            List<String> endpoints = rule.patterns().stream()
                    .map(p -> (rule.method() == null ? "" : rule.method().name() + " ") + p)
                    .toList();
            rows.add(new PermissionRow(rule.id(), rule.label(), rule.group(), access, endpoints));
            grants.put(rule.id(), roles.stream()
                    .filter(r -> rule.allows(Role.valueOf(r.id())))
                    .map(RoleRef::id)
                    .toList());
        }
        return new PermissionMatrix(roles, rows, grants);
    }
}
