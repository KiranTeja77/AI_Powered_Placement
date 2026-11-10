package com.placewise.api.auth;

import com.placewise.api.common.ApiException;
import com.placewise.api.student.Student;
import com.placewise.api.student.StudentRepository;
import com.placewise.api.user.AppUser;
import com.placewise.api.user.AppUserRepository;
import com.placewise.api.user.Department;
import com.placewise.api.user.DepartmentRepository;
import com.placewise.api.user.Role;
import com.placewise.api.user.UserMapper;
import com.placewise.api.user.UserResponse;
import java.time.Clock;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    static final String BAD_CREDENTIALS = "Email, roll number or password is incorrect.";

    /** Result of a login or refresh: the JSON body plus the raw refresh token for the cookie. */
    public record Session(AuthDtos.AuthResponse body, String refreshToken) {}

    private final AppUserRepository users;
    private final StudentRepository students;
    private final DepartmentRepository departments;
    private final PasswordEncoder encoder;
    private final AccessTokenService accessTokens;
    private final RefreshTokenService refreshTokens;
    private final LoginRateLimiter limiter;
    private final UserMapper mapper;
    private final Clock clock;
    /** Compared against when the account does not exist, so timing does not reveal it. */
    private final String dummyHash;

    AuthService(AppUserRepository users, StudentRepository students, DepartmentRepository departments,
            PasswordEncoder encoder, AccessTokenService accessTokens, RefreshTokenService refreshTokens,
            LoginRateLimiter limiter, UserMapper mapper, Clock clock) {
        this.users = users;
        this.students = students;
        this.departments = departments;
        this.encoder = encoder;
        this.accessTokens = accessTokens;
        this.refreshTokens = refreshTokens;
        this.limiter = limiter;
        this.mapper = mapper;
        this.clock = clock;
        this.dummyHash = encoder.encode("not-a-real-password-1");
    }

    @Transactional
    public UserResponse register(AuthDtos.RegisterRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String rollNo = req.rollNo().trim().toUpperCase(Locale.ROOT);

        Map<String, String> conflicts = new java.util.LinkedHashMap<>();
        if (users.existsByEmailIgnoreCase(email)) {
            conflicts.put("email", "An account with this email already exists");
        }
        if (students.existsByRollNo(rollNo)) {
            conflicts.put("rollNo", "An account with this roll number already exists");
        }
        if (!conflicts.isEmpty()) {
            throw ApiException.conflict("Some details are already registered.", conflicts);
        }
        Department department = departments.findById(req.departmentId()).orElseThrow(() ->
                ApiException.invalid("Some fields are not valid.", Map.of("departmentId", "Select a department")));

        var now = clock.instant();
        AppUser user = users.saveAndFlush(new AppUser(email, encoder.encode(req.password()),
                req.fullName().trim(), Role.STUDENT, department, now));
        students.save(new Student(user.getId(), rollNo, department, req.graduationYear(), now));
        return mapper.toResponse(user);
    }

    /** Failed attempts are recorded before throwing, so the transaction must not roll back. */
    @Transactional(noRollbackFor = ApiException.class)
    public Session login(AuthDtos.LoginRequest req, String ip) {
        String identifier = req.identifier().trim().toLowerCase(Locale.ROOT);
        limiter.assertNotLimited(identifier, ip);

        Optional<AppUser> found = findByIdentifier(identifier);
        boolean matches = encoder.matches(req.password(), found.map(AppUser::getPasswordHash).orElse(dummyHash));
        if (found.isEmpty() || !matches) {
            limiter.recordFailure(identifier, ip);
            throw ApiException.unauthorized(BAD_CREDENTIALS);
        }
        AppUser user = found.get();
        if (!user.isActive()) {
            throw ApiException.forbidden("account_disabled", "This account has been deactivated.");
        }
        limiter.clear(identifier, ip);
        user.recordLogin(clock.instant());
        return session(user, refreshTokens.startSession(user.getId()));
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawRefreshToken) {
        RefreshTokenService.Issued issued = refreshTokens.rotate(rawRefreshToken);
        return session(issued.user(), issued.rawToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokens.revokeSession(rawRefreshToken);
        }
    }

    private Optional<AppUser> findByIdentifier(String identifier) {
        if (identifier.contains("@")) {
            return users.findByEmailIgnoreCase(identifier);
        }
        return students.findByRollNo(identifier.toUpperCase(Locale.ROOT))
                .flatMap(s -> users.findById(s.getUserId()));
    }

    private Session session(AppUser user, String refreshToken) {
        var body = new AuthDtos.AuthResponse(accessTokens.issue(user), "Bearer",
                accessTokens.expiresInSeconds(), mapper.toResponse(user));
        return new Session(body, refreshToken);
    }
}
