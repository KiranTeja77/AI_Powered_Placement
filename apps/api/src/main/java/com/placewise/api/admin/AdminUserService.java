package com.placewise.api.admin;

import com.placewise.api.admin.AdminDtos.AdminUserRow;
import com.placewise.api.admin.AdminDtos.CreateUserRequest;
import com.placewise.api.admin.AdminDtos.DepartmentRef;
import com.placewise.api.auth.PasswordResetService;
import com.placewise.api.auth.RefreshTokenService;
import com.placewise.api.auth.TokenCodec;
import com.placewise.api.common.ApiException;
import com.placewise.api.common.PageResponse;
import com.placewise.api.student.Student;
import com.placewise.api.student.StudentRepository;
import com.placewise.api.user.AppUser;
import com.placewise.api.user.AppUserRepository;
import com.placewise.api.user.Department;
import com.placewise.api.user.DepartmentRepository;
import com.placewise.api.user.Role;
import com.placewise.api.user.UserStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AdminUserService {

    private static final Logger log = LoggerFactory.getLogger(AdminUserService.class);
    private static final Set<Role> STAFF = Set.of(Role.FACULTY, Role.TP_HEAD, Role.RECRUITER, Role.ADMIN);

    private final AppUserRepository users;
    private final StudentRepository students;
    private final DepartmentRepository departments;
    private final PasswordResetService invites;
    private final RefreshTokenService refreshTokens;
    private final PasswordEncoder encoder;
    private final Clock clock;

    AdminUserService(AppUserRepository users, StudentRepository students, DepartmentRepository departments,
            PasswordResetService invites, RefreshTokenService refreshTokens, PasswordEncoder encoder,
            Clock clock) {
        this.users = users;
        this.students = students;
        this.departments = departments;
        this.invites = invites;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    PageResponse<AdminUserRow> list(int page, int size, Role role, UUID departmentId, UserStatus status,
            String search) {
        Page<AppUser> rows = users.findAll(filter(role, departmentId, status, search),
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));
        Map<UUID, Student> byUser = students.findAllById(rows.stream().map(AppUser::getId).toList()).stream()
                .collect(Collectors.toMap(Student::getUserId, Function.identity()));
        List<AdminUserRow> items = rows.stream().map(u -> toRow(u, byUser.get(u.getId()))).toList();
        return new PageResponse<>(items, rows.getNumber(), rows.getSize(), rows.getTotalElements(),
                rows.getTotalPages());
    }

    /**
     * Creates a staff account that nobody can sign in to yet: its password is a random value that
     * is hashed and thrown away. The person chooses their own through the emailed link.
     */
    @Transactional
    AdminUserRow create(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        Role role = request.role();
        if (!STAFF.contains(role)) {
            throw ApiException.invalid("Students register themselves.",
                    Map.of("role", "Choose faculty, T&P head, recruiter or admin."));
        }
        Department department = null;
        if (role == Role.FACULTY) {
            if (request.departmentId() == null) {
                throw ApiException.invalid("A department is needed.",
                        Map.of("departmentId", "Choose the faculty member's department."));
            }
            department = departments.findById(request.departmentId()).orElseThrow(() -> ApiException.invalid(
                    "Unknown department.", Map.of("departmentId", "Choose a department from the list.")));
        } else if (request.departmentId() != null) {
            throw ApiException.invalid("A department does not apply to this role.",
                    Map.of("departmentId", "Only faculty belong to a department."));
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists.",
                    Map.of("email", "An account with this email already exists."));
        }
        AppUser user = users.save(new AppUser(email, encoder.encode(TokenCodec.newToken()),
                request.fullName().trim(), role, department, clock.instant()));
        try {
            invites.invite(user, roleLabel(role));
        } catch (RuntimeException e) {
            // Undo the account too: one that nobody can sign in to is worse than a clear error.
            log.warn("Account invite could not be sent ({})", e.getClass().getSimpleName());
            throw ApiException.unavailable("mail_unavailable",
                    "The email could not be sent, so the account was not created. Try again in a moment.", 30);
        }
        return toRow(user, null);
    }

    /** Deactivating also ends every session the person has. An admin cannot lock themselves out. */
    @Transactional
    AdminUserRow setStatus(UUID actorId, UUID id, UserStatus status) {
        AppUser user = users.findById(id).orElseThrow(() -> ApiException.notFound("No such user."));
        if (status == UserStatus.INACTIVE && user.getId().equals(actorId)) {
            throw new ApiException(HttpStatus.CONFLICT, "cannot_deactivate_self",
                    "You cannot deactivate your own account.", null, null);
        }
        user.setStatus(status, clock.instant());
        users.save(user);
        if (status == UserStatus.INACTIVE) {
            refreshTokens.revokeAllForUser(user.getId());
        }
        return toRow(user, students.findById(user.getId()).orElse(null));
    }

    private AdminUserRow toRow(AppUser u, Student student) {
        Department d = u.getDepartment();
        return new AdminUserRow(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getStatus(),
                d == null ? null : new DepartmentRef(d.getId(), d.getCode(), d.getName()),
                student == null ? null : student.getRollNo(), u.getLastLoginAt(), u.getCreatedAt());
    }

    private static Specification<AppUser> filter(Role role, UUID departmentId, UserStatus status, String search) {
        return (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if (role != null) {
                all.add(cb.equal(root.get("role"), role));
            }
            if (status != null) {
                all.add(cb.equal(root.get("status"), status));
            }
            if (departmentId != null) {
                // Faculty carry the department on the account, students on their student record.
                Subquery<UUID> own = query.subquery(UUID.class);
                Root<Student> s = own.from(Student.class);
                own.select(s.get("userId")).where(cb.equal(s.get("userId"), root.get("id")),
                        cb.equal(s.get("department").get("id"), departmentId));
                all.add(cb.or(cb.equal(root.get("department").get("id"), departmentId), cb.exists(own)));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + escapeLike(search.trim().toLowerCase(Locale.ROOT)) + "%";
                Subquery<UUID> byRoll = query.subquery(UUID.class);
                Root<Student> s = byRoll.from(Student.class);
                byRoll.select(s.get("userId")).where(cb.equal(s.get("userId"), root.get("id")),
                        cb.like(cb.lower(s.get("rollNo")), pattern, '\\'));
                all.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
                        cb.like(cb.lower(root.get("email")), pattern, '\\'),
                        cb.exists(byRoll)));
            }
            return cb.and(all.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String roleLabel(Role role) {
        return switch (role) {
            case FACULTY -> "a faculty member";
            case TP_HEAD -> "a Training and Placement head";
            case RECRUITER -> "a recruiter";
            case ADMIN -> "an administrator";
            case STUDENT -> "a student";
        };
    }
}
