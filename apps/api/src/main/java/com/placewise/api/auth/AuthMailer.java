package com.placewise.api.auth;

/** Outbound auth emails. The SMTP implementation is replaced in tests. */
public interface AuthMailer {

    void sendPasswordReset(String toEmail, String fullName, String resetLink);
}
