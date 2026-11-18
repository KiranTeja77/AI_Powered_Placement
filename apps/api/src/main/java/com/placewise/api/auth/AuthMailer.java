package com.placewise.api.auth;

/** Outbound auth emails. The SMTP implementation is replaced in tests. */
public interface AuthMailer {

    void sendPasswordReset(String toEmail, String fullName, String resetLink);

    /** The first email to a staff account an admin created: a link to choose a password. */
    void sendAccountInvite(String toEmail, String fullName, String roleLabel, String setPasswordLink);
}
