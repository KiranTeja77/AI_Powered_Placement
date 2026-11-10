package com.placewise.api.auth;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class PasswordPolicyValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && satisfiesPolicy(value);
    }

    public static boolean satisfiesPolicy(String password) {
        if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return false;
        }
        boolean letter = false;
        boolean digit = false;
        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            letter |= Character.isLetter(c);
            digit |= Character.isDigit(c);
        }
        return letter && digit;
    }
}
