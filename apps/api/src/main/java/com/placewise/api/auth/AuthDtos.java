package com.placewise.api.auth;

import com.placewise.api.user.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Request and response bodies for the auth endpoints. */
public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9/_-]{2,31}$",
                    message = "Use 3 to 32 letters, numbers, slashes, dashes or underscores") String rollNo,
            @NotNull UUID departmentId,
            @NotNull @Min(2000) @Max(2100) Integer graduationYear,
            @ValidPassword String password) {}

    public record LoginRequest(@NotBlank String identifier, @NotBlank String password) {}

    public record ForgotPasswordRequest(@NotBlank @Email String email) {}

    public record ResetPasswordRequest(@NotBlank String token, @ValidPassword String newPassword) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword, @ValidPassword String newPassword) {}

    /** Returned by login and refresh. The refresh token travels only in an httpOnly cookie. */
    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {}
}
