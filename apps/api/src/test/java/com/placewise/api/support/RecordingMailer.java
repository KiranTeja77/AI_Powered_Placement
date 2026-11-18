package com.placewise.api.support;

import com.placewise.api.auth.AuthMailer;
import java.util.ArrayList;
import java.util.List;

/** Captures outgoing auth emails instead of sending them. */
public class RecordingMailer implements AuthMailer {

    public record Sent(String to, String name, String link) {}

    private final List<Sent> sent = new ArrayList<>();
    private boolean failInvites;

    @Override
    public synchronized void sendPasswordReset(String toEmail, String fullName, String resetLink) {
        sent.add(new Sent(toEmail, fullName, resetLink));
    }

    @Override
    public synchronized void sendAccountInvite(String toEmail, String fullName, String roleLabel, String setPasswordLink) {
        if (failInvites) {
            throw new IllegalStateException("mail server down");
        }
        sent.add(new Sent(toEmail, fullName, setPasswordLink));
    }

    public synchronized List<Sent> sent() {
        return List.copyOf(sent);
    }

    /** Makes account invites fail, as when the mail server is down. */
    public synchronized void failInvites(boolean fail) {
        failInvites = fail;
    }

    public synchronized void clear() {
        failInvites = false;
        sent.clear();
    }

    /** The raw token from the most recent reset link. */
    public synchronized String lastToken() {
        String link = sent.get(sent.size() - 1).link();
        return link.substring(link.indexOf("token=") + "token=".length());
    }
}
