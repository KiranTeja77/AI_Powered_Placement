package com.placewise.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordPolicyValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"abcdefg1", "Passw0rdOk", "12345678a", "longer passphrase 42"})
    void acceptsLetterPlusNumberOfEightOrMore(String password) {
        assertThat(PasswordPolicyValidator.satisfiesPolicy(password)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"short1a", "abcdefgh", "12345678", "        ", ""})
    void rejectsTooShortOrMissingLetterOrNumber(String password) {
        assertThat(PasswordPolicyValidator.satisfiesPolicy(password)).isFalse();
    }

    @Test
    void rejectsMoreThan72BytesBecauseBCryptTruncates() {
        assertThat(PasswordPolicyValidator.satisfiesPolicy("a1".repeat(36))).isTrue();
        assertThat(PasswordPolicyValidator.satisfiesPolicy("a1".repeat(37))).isFalse();
    }

    @Test
    void nullIsInvalid() {
        assertThat(new PasswordPolicyValidator().isValid(null, null)).isFalse();
    }
}
