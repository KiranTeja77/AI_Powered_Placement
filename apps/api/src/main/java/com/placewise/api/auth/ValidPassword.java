package com.placewise.api.auth;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;

/** At least 8 characters, with a letter and a number. Capped at 72 bytes (BCrypt limit). */
@Documented
@Constraint(validatedBy = PasswordPolicyValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {

    String message() default "Use at least 8 characters with a letter and a number";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
